import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { LiveServerMessage, Modality, Type } from "@google/genai";
import { createGeminiClient, createGeminiLiveClient } from "./server/geminiClient";
import { buildZoyaSystemInstruction, SessionPersonalization, zoyaTools } from "./server/zoyaPersona";
import { buildProjectZipBuffer } from "./server/projectZip";

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

// Simple sliding-window rate limiter for API routes
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (entry.count >= 60) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  entry.count += 1;
  return next();
}

async function runWebSearch(query: string) {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Answer concisely with accurate, current facts for a voice assistant speaking to the user. Query: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c: { web?: { uri?: string; title?: string } }) => c.web)
    .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
    .slice(0, 5);

  return {
    summary: response.text ?? "No summary available.",
    sources,
  };
}

async function runYouTubeSearch(query: string) {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Find up to 4 real YouTube videos matching "${query}". Return ONLY a JSON array of objects with fields: title, channel, videoId (11-char YouTube ID if present in URL), url. Use Google Search to locate real youtube.com/watch?v=... URLs.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            channel: { type: Type.STRING },
            videoId: { type: Type.STRING },
            url: { type: Type.STRING },
          },
          required: ["title", "url"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text ?? "[]");
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        let vid = typeof item.videoId === "string" ? item.videoId.trim() : "";
        if (!vid && typeof item.url === "string") {
          const match = item.url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
          if (match) vid = match[1];
        }
        return {
          title: String(item.title || query),
          channel: String(item.channel || "YouTube"),
          videoId: vid,
          url: vid ? `https://www.youtube.com/watch?v=${vid}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        };
      });
    }
  } catch {
    // Fallback below
  }

  return [
    {
      title: `Search YouTube: ${query}`,
      channel: "YouTube",
      videoId: "",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    },
  ];
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractEmailBody(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
  if (p.body?.data && p.mimeType === "text/plain") {
    return decodeBase64Url(p.body.data);
  }
  if (Array.isArray(p.parts)) {
    for (const part of p.parts) {
      const text = extractEmailBody(part);
      if (text) return text;
    }
  }
  if (p.body?.data) {
    return decodeBase64Url(p.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", apiRateLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ZOYA AI Server",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.get("/api/export-zip", (_req, res) => {
    try {
      const { buffer, fileCount } = buildProjectZipBuffer();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="zoya-ai-github.zip"');
      res.setHeader("X-Export-File-Count", String(fileCount));
      return res.send(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to build project archive";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/search", async (req, res) => {
    try {
      const query = String(req.body?.query || "").trim();
      if (!query || query.length > 400) {
        return res.status(400).json({ error: "Valid query is required." });
      }
      const data = await runWebSearch(query);
      return res.json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      return res.status(500).json({ error: msg });
    }
  });

  // Authorized Gmail API proxy (uses client OAuth Bearer token)
  app.get("/api/gmail/messages", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Gmail authorization token." });
    }
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const maxResults = Math.min(Math.max(Number(req.query.maxResults) || 5, 1), 10);
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      listUrl.searchParams.set("maxResults", String(maxResults));
      if (q) listUrl.searchParams.set("q", q);

      const listRes = await fetch(listUrl.toString(), {
        headers: { Authorization: authHeader },
      });
      if (!listRes.ok) {
        const errBody = await listRes.text();
        return res.status(listRes.status).json({ error: "Gmail API error", detail: errBody });
      }
      const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
      const messageRefs = listData.messages ?? [];

      const messages = await Promise.all(
        messageRefs.map(async (ref) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: authHeader } }
          );
          if (!detailRes.ok) return null;
          const detail = (await detailRes.json()) as {
            id: string;
            snippet?: string;
            labelIds?: string[];
            payload?: { headers?: Array<{ name: string; value: string }> };
          };
          const headers = detail.payload?.headers ?? [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
          return {
            id: detail.id,
            from: getHeader("From"),
            subject: getHeader("Subject") || "(No subject)",
            date: getHeader("Date"),
            snippet: detail.snippet ?? "",
            unread: detail.labelIds?.includes("UNREAD") ?? false,
          };
        })
      );

      return res.json({ messages: messages.filter(Boolean) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch Gmail messages";
      return res.status(500).json({ error: msg });
    }
  });

  app.get("/api/gmail/messages/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Gmail authorization token." });
    }
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(req.params.id)}?format=full`,
        { headers: { Authorization: authHeader } }
      );
      if (!msgRes.ok) {
        return res.status(msgRes.status).json({ error: "Failed to read Gmail message." });
      }
      const detail = (await msgRes.json()) as {
        id: string;
        snippet?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = detail.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      const body = extractEmailBody(detail.payload) || detail.snippet || "";

      return res.json({
        id: detail.id,
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject") || "(No subject)",
        date: getHeader("Date"),
        body: body.slice(0, 4000),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read Gmail message";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/gmail/send", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Gmail authorization token." });
    }
    const { to, subject, body, confirmed } = req.body ?? {};
    if (confirmed !== true) {
      return res.status(400).json({ error: "Explicit user confirmation is required before sending email." });
    }
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Recipient, subject, and body are required." });
    }

    try {
      const rawMime = [
        `To: ${String(to).replace(/[\r\n]/g, "")}`,
        `Subject: =?UTF-8?B?${Buffer.from(String(subject)).toString("base64")}?=`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "",
        String(body),
      ].join("\r\n");

      const encoded = Buffer.from(rawMime)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        return res.status(sendRes.status).json({ error: "Gmail send failed", detail: errText });
      }
      const result = await sendRes.json();
      return res.json({ sent: true, id: result.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email send failed";
      return res.status(500).json({ error: msg });
    }
  });

  // Vite dev middleware vs static production serving
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  const server = http.createServer(app);

  // WebSocket Server for Gemini Live API bidirectional audio/video streaming
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", (clientWs: WebSocket) => {
    let liveSession: Awaited<ReturnType<ReturnType<typeof createGeminiClient>["live"]["connect"]>> | null = null;
    let isClosing = false;
    let isStarting = false;

    const safeSend = (payload: unknown) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const connectWithVersion = async (
      apiVersion: "v1beta" | "v1alpha",
      voiceName: "Zephyr" | "Kore",
      prefs: SessionPersonalization
    ) => {
      const ai = createGeminiLiveClient(apiVersion);
      return ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: buildZoyaSystemInstruction(prefs),
          tools: [{ functionDeclarations: zoyaTools }],
        },
        callbacks: {
          onmessage: async (liveMsg: LiveServerMessage) => {
            const sc = liveMsg.serverContent;
            if (sc?.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  safeSend({ type: "audio", data: part.inlineData.data });
                }
              }
            }
            if (sc?.interrupted) {
              safeSend({ type: "interrupted" });
            }
            if (sc?.turnComplete) {
              safeSend({ type: "turn_complete" });
            }
            if (sc?.inputTranscription?.text) {
              safeSend({ type: "input_transcript", text: sc.inputTranscription.text });
            }
            if (sc?.outputTranscription?.text) {
              safeSend({ type: "output_transcript", text: sc.outputTranscription.text });
            }

            // Handle Function Calling from Gemini Live
            const calls = liveMsg.toolCall?.functionCalls ?? [];
            for (const call of calls) {
              const callId = call.id || `${call.name}-${Date.now()}`;
              const args = (call.args || {}) as Record<string, unknown>;

              if (call.name === "searchWeb") {
                try {
                  const searchResult = await runWebSearch(String(args.query || ""));
                  safeSend({
                    type: "tool_event",
                    name: "searchWeb",
                    args,
                    result: searchResult,
                  });
                  liveSession?.sendToolResponse({
                    functionResponses: [
                      { id: callId, name: call.name, response: searchResult },
                    ],
                  });
                } catch (err: unknown) {
                  liveSession?.sendToolResponse({
                    functionResponses: [
                      {
                        id: callId,
                        name: call.name,
                        response: { error: err instanceof Error ? err.message : "Search failed" },
                      },
                    ],
                  });
                }
              } else if (call.name === "searchYouTube") {
                try {
                  const videos = await runYouTubeSearch(String(args.query || ""));
                  const payload = {
                    query: String(args.query || ""),
                    autoPlayFirst: Boolean(args.autoPlayFirst ?? true),
                    videos,
                  };
                  safeSend({
                    type: "tool_event",
                    name: "searchYouTube",
                    args,
                    result: payload,
                  });
                  liveSession?.sendToolResponse({
                    functionResponses: [
                      { id: callId, name: call.name, response: payload },
                    ],
                  });
                } catch (err: unknown) {
                  liveSession?.sendToolResponse({
                    functionResponses: [
                      {
                        id: callId,
                        name: call.name,
                        response: { error: err instanceof Error ? err.message : "YouTube search failed" },
                      },
                    ],
                  });
                }
              } else {
                // Forward device, browser, Gmail, Telegram, Screen Share, and Memory tools to client
                safeSend({
                  type: "tool_call",
                  id: callId,
                  name: call.name,
                  args,
                });
              }
            }
          },
          onerror: (err: unknown) => {
            // Only forward active-session errors after setup completes
            if (!liveSession) return;
            const detail =
              err instanceof Error
                ? err.message
                : typeof (err as { message?: unknown })?.message === "string"
                  ? String((err as { message: string }).message)
                  : "Gemini Live connection error";
            safeSend({ type: "error", message: detail });
          },
          onclose: () => {
            if (!isClosing && liveSession) {
              safeSend({ type: "closed" });
            }
          },
        },
      });
    };

    clientWs.on("message", async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        // 1. Handshake & start Gemini Live session
        if (msg.type === "start") {
          if (liveSession || isStarting) return;
          isStarting = true;
          const prefs: SessionPersonalization = msg.personalization || {};
          const voiceName = msg.voiceName === "Kore" ? "Kore" : "Zephyr";

          try {
            try {
              liveSession = await connectWithVersion("v1beta", voiceName, prefs);
            } catch (firstErr: unknown) {
              const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
              if (firstMsg.includes("404") || firstMsg.includes("not found")) {
                liveSession = await connectWithVersion("v1alpha", voiceName, prefs);
              } else {
                throw firstErr;
              }
            }

            if (isClosing || clientWs.readyState !== WebSocket.OPEN) {
              liveSession.close();
              liveSession = null;
              return;
            }
            safeSend({ type: "ready" });
          } finally {
            isStarting = false;
          }
          return;
        }

        // 2. Stream 16kHz PCM audio input from microphone
        if (msg.type === "audio" && liveSession && typeof msg.data === "string") {
          liveSession.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
          return;
        }

        // 3. Stream 1 FPS JPEG video frames from Screen Share / MediaProjection
        if (msg.type === "video" && liveSession && typeof msg.data === "string") {
          liveSession.sendRealtimeInput({
            video: { data: msg.data, mimeType: "image/jpeg" },
          });
          return;
        }

        // 4. Forward client tool execution response back into Gemini Live
        if (msg.type === "tool_response" && liveSession) {
          liveSession.sendToolResponse({
            functionResponses: [
              {
                id: String(msg.id),
                name: String(msg.name),
                response: msg.response ?? { ok: true },
              },
            ],
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid Live session message";
        safeSend({ type: "error", message });
      }
    });

    clientWs.on("close", () => {
      isClosing = true;
      try {
        liveSession?.close();
      } catch {
        // ignore close errors
      }
      liveSession = null;
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`ZOYA AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start ZOYA AI server:", err);
  process.exit(1);
});
