import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "firebase/auth";
import {
  ActionOverlayState,
  AndroidPermissionStatus,
  AssistantSettings,
  MemoryItem,
  PendingConfirmation,
  VoiceState,
  WebSearchResult,
  YouTubeVideoItem,
} from "../types/assistant";
import { AudioStreamer } from "../services/AudioStreamer";
import { LiveSession } from "../services/LiveSession";
import { executeValidatedToolCall } from "../services/BrowserTools";
import {
  addMemoryFact,
  clearAllMemories,
  deleteMemoryFact,
  loadMemories,
  loadSettings,
  saveSettings,
} from "../services/MemoryService";
import {
  getCachedGmailToken,
  initGmailAuth,
  sendConfirmedGmail,
  signInWithGmail,
  signOutGmail,
} from "../services/GmailService";
import { AndroidBridge } from "../services/AndroidBridge";

export function useVoiceAssistant() {
  const [voiceState, setVoiceState] = useState<VoiceState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveCaption, setLiveCaption] = useState<string>("");
  const [settings, setSettings] = useState<AssistantSettings>(() => loadSettings());
  const [memories, setMemories] = useState<MemoryItem[]>(() => loadMemories());
  const [actionOverlay, setActionOverlay] = useState<ActionOverlayState>({ kind: "none" });
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const [gmailUser, setGmailUser] = useState<User | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [androidStatus, setAndroidStatus] = useState<AndroidPermissionStatus>({
    isNativeAndroid: false,
    microphone: false,
    notifications: false,
    accessibilityEnabled: false,
    screenCaptureActive: false,
    backgroundServiceActive: false,
  });

  // Mutable refs for audio callbacks & timers to avoid stale closures
  const streamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const settingsRef = useRef(settings);
  const gmailConnectedRef = useRef(gmailConnected);
  const isPlayingOutputRef = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenTimerRef = useRef<number | null>(null);
  const screenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeScreenListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const nativeStopListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    gmailConnectedRef.current = gmailConnected;
  }, [gmailConnected]);

  // Initialize Gmail Firebase auth state listener & Android status check
  useEffect(() => {
    const unsub = initGmailAuth(
      (user) => {
        setGmailUser(user);
        setGmailConnected(true);
      },
      () => {
        setGmailUser(null);
        setGmailConnected(false);
      }
    );

    void AndroidBridge.getPermissionStatus().then(setAndroidStatus).catch(() => undefined);

    return () => {
      unsub();
    };
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (screenTimerRef.current !== null) {
      window.clearInterval(screenTimerRef.current);
      screenTimerRef.current = null;
    }
    if (screenStreamRef.current) {
      for (const track of screenStreamRef.current.getTracks()) {
        track.stop();
      }
      screenStreamRef.current = null;
    }
    if (screenVideoElRef.current) {
      screenVideoElRef.current.srcObject = null;
      screenVideoElRef.current = null;
    }
    if (nativeScreenListenerRef.current) {
      await nativeScreenListenerRef.current.remove().catch(() => undefined);
      nativeScreenListenerRef.current = null;
    }
    if (nativeStopListenerRef.current) {
      await nativeStopListenerRef.current.remove().catch(() => undefined);
      nativeStopListenerRef.current = null;
    }
    if (AndroidBridge.isNativeAndroid()) {
      await AndroidBridge.stopScreenCapture().catch(() => undefined);
    }
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async (): Promise<boolean> => {
    try {
      if (AndroidBridge.isNativeAndroid()) {
        const res = await AndroidBridge.startScreenCapture();
        if (!res.active) return false;

        nativeScreenListenerRef.current = await AndroidBridge.addScreenFrameListener((jpegBase64) => {
          sessionRef.current?.sendVideoFrame(jpegBase64);
        });
        nativeStopListenerRef.current = await AndroidBridge.addScreenStopListener(() => {
          void stopScreenShare();
        });
        setIsScreenSharing(true);
        return true;
      }

      if (!navigator.mediaDevices?.getDisplayMedia) {
        setErrorMessage("Screen sharing is not supported in this browser.");
        return false;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 2, max: 5 } },
        audio: false,
      });

      screenStreamRef.current = stream;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      screenVideoElRef.current = video;

      const canvas = document.createElement("canvas");
      screenCanvasRef.current = canvas;

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          void stopScreenShare();
        };
      }

      // Send at most 1 FPS JPEG frame to Gemini Live API
      screenTimerRef.current = window.setInterval(() => {
        const v = screenVideoElRef.current;
        const c = screenCanvasRef.current;
        if (!v || !c || v.readyState < 2) return;
        const maxWidth = 960;
        const scale = v.videoWidth > maxWidth ? maxWidth / v.videoWidth : 1;
        c.width = Math.max(1, Math.round(v.videoWidth * scale));
        c.height = Math.max(1, Math.round(v.videoHeight * scale));
        const ctx2d = c.getContext("2d");
        if (!ctx2d) return;
        ctx2d.drawImage(v, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.7);
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          sessionRef.current?.sendVideoFrame(base64);
        }
      }, 1000);

      setIsScreenSharing(true);
      return true;
    } catch {
      return false;
    }
  }, [stopScreenShare]);

  const saveMemoryIfAllowed = useCallback(
    (category: MemoryItem["category"], fact: string): boolean => {
      if (!settingsRef.current.memoryEnabled) return false;
      if (category === "name" && fact.trim()) {
        setSettings((prev) => ({ ...prev, userName: fact.trim() }));
      }
      const updated = addMemoryFact(category, fact);
      setMemories(updated);
      return true;
    },
    []
  );

  const disconnect = useCallback(async () => {
    await stopScreenShare();
    sessionRef.current?.disconnect();
    sessionRef.current = null;
    await streamerRef.current?.stop();
    streamerRef.current = null;
    isPlayingOutputRef.current = false;
    setIsMuted(false);
    setLiveCaption("");
    setVoiceState("disconnected");
  }, [stopScreenShare]);

  const connect = useCallback(async () => {
    setErrorMessage(null);
    setVoiceState("connecting");

    try {
      const streamer = new AudioStreamer({
        onMicPcmBase64: (base64) => {
          sessionRef.current?.sendAudio(base64);
        },
        onPlaybackStateChange: (playing) => {
          isPlayingOutputRef.current = playing;
          setVoiceState((prev) => {
            if (prev === "disconnected" || prev === "error") return prev;
            return playing ? "speaking" : "listening";
          });
        },
      });

      await streamer.start();
      streamerRef.current = streamer;

      const session = new LiveSession(
        async (event) => {
          switch (event.type) {
            case "ready":
              setVoiceState("listening");
              break;
            case "audio":
              streamerRef.current?.playPcmChunk(event.data);
              break;
            case "interrupted":
              streamerRef.current?.clearPlaybackQueue();
              setVoiceState("listening");
              break;
            case "input_transcript":
              if (settingsRef.current.showLiveCaptions) {
                setLiveCaption(event.text);
              }
              break;
            case "output_transcript":
              if (settingsRef.current.showLiveCaptions) {
                setLiveCaption(event.text);
              }
              break;
            case "tool_event":
              if (event.name === "searchWeb") {
                const res = event.result as { summary: string; sources: Array<{ uri: string; title?: string }> };
                const searchData: WebSearchResult = {
                  query: String(event.args.query || ""),
                  summary: res.summary,
                  sources: res.sources || [],
                };
                setActionOverlay({ kind: "search", data: searchData });
              } else if (event.name === "searchYouTube") {
                const res = event.result as {
                  query: string;
                  autoPlayFirst: boolean;
                  videos: YouTubeVideoItem[];
                };
                const firstId = res.videos?.[0]?.videoId || "";
                setActionOverlay({
                  kind: "youtube",
                  query: res.query,
                  videos: res.videos || [],
                  activeVideoId: res.autoPlayFirst && firstId ? firstId : undefined,
                  isPlaying: Boolean(res.autoPlayFirst && firstId),
                });
              }
              break;
            case "tool_call": {
              const result = await executeValidatedToolCall(event.name, event.args, {
                setActionOverlay,
                setPendingConfirmation,
                startScreenShare,
                stopScreenShare,
                saveMemory: saveMemoryIfAllowed,
              });
              sessionRef.current?.sendToolResponse(event.id, event.name, result);
              break;
            }
            case "error":
              setErrorMessage(event.message);
              setVoiceState("error");
              sessionRef.current?.disconnect();
              sessionRef.current = null;
              void streamerRef.current?.stop();
              streamerRef.current = null;
              break;
            case "closed":
              setVoiceState("disconnected");
              break;
          }
        },
        (connected, reconnecting) => {
          if (reconnecting) {
            setVoiceState("connecting");
          } else if (!connected) {
            setVoiceState((prev) => (prev === "error" ? prev : "disconnected"));
          }
        }
      );

      sessionRef.current = session;
      session.connect({
        voiceName: settingsRef.current.voiceName,
        personalization: {
          userName: settingsRef.current.userName,
          preferredLanguage: settingsRef.current.preferredLanguage,
          memories: settingsRef.current.memoryEnabled
            ? memories.map((m) => ({ category: m.category, fact: m.fact }))
            : [],
          isNativeAndroid: AndroidBridge.isNativeAndroid(),
          gmailConnected: gmailConnectedRef.current && Boolean(getCachedGmailToken()),
        },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Microphone permission is required to talk with ZOYA.";
      setErrorMessage(msg);
      setVoiceState("error");
      await streamerRef.current?.stop();
      streamerRef.current = null;
    }
  }, [memories, saveMemoryIfAllowed, startScreenShare, stopScreenShare]);

  const toggleVoiceConnection = useCallback(async () => {
    if (voiceState === "disconnected" || voiceState === "error") {
      await connect();
    } else {
      await disconnect();
    }
  }, [connect, disconnect, voiceState]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      streamerRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const toggleScreenShareButton = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const handleGmailSignIn = useCallback(async () => {
    try {
      const { user } = await signInWithGmail();
      setGmailUser(user);
      setGmailConnected(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Google Sign-In failed.");
    }
  }, []);

  const handleGmailSignOut = useCallback(async () => {
    await signOutGmail();
    setGmailUser(null);
    setGmailConnected(false);
  }, []);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    const item = pendingConfirmation;
    setPendingConfirmation(null);

    if (item.kind === "gmail_send") {
      try {
        await sendConfirmedGmail({
          to: item.to,
          subject: item.subject,
          body: item.body,
        });
        setActionOverlay({
          kind: "app_launch",
          app: "Gmail",
          note: `Email sent to ${item.to}.`,
        });
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to send email.");
      }
      return;
    }

    if (item.kind === "telegram_send") {
      if (AndroidBridge.isNativeAndroid()) {
        await AndroidBridge.openTelegramCompose(item.recipient, item.message);
      } else {
        const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(item.message)}`;
        setActionOverlay({
          kind: "app_launch",
          app: "Telegram",
          url: shareUrl,
          note: `Tap below to open Telegram with your message to ${item.recipient}.`,
        });
      }
      return;
    }

    if (item.kind === "website_open") {
      setActionOverlay({
        kind: "app_launch",
        app: item.label,
        url: item.url,
        note: `Tap the link below to open ${item.label}.`,
      });
      return;
    }

    if (item.kind === "browser_sensitive") {
      if (AndroidBridge.isNativeAndroid()) {
        await AndroidBridge.performAccessibilityAction(item.action, item.target, item.value);
      }
    }
  }, [pendingConfirmation]);

  const cancelPendingAction = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  const removeMemory = useCallback((id: string) => {
    setMemories(deleteMemoryFact(id));
  }, []);

  const wipeAllMemories = useCallback(() => {
    setMemories(clearAllMemories());
  }, []);

  const toggleBackgroundService = useCallback(async (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, backgroundServiceEnabled: enabled }));
    if (AndroidBridge.isNativeAndroid()) {
      if (enabled) {
        await AndroidBridge.startBackgroundService();
      } else {
        await AndroidBridge.stopBackgroundService();
      }
      const nextStatus = await AndroidBridge.getPermissionStatus().catch(() => null);
      if (nextStatus) setAndroidStatus(nextStatus);
    }
  }, []);

  const getAudioMetrics = useCallback(() => {
    return streamerRef.current?.getAudioMetrics() ?? { micLevel: 0, outputLevel: 0 };
  }, []);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    voiceState,
    isMuted,
    isScreenSharing,
    errorMessage,
    clearError: () => setErrorMessage(null),
    liveCaption,
    settings,
    setSettings,
    memories,
    removeMemory,
    wipeAllMemories,
    actionOverlay,
    setActionOverlay,
    pendingConfirmation,
    confirmPendingAction,
    cancelPendingAction,
    gmailUser,
    gmailConnected,
    handleGmailSignIn,
    handleGmailSignOut,
    androidStatus,
    toggleVoiceConnection,
    toggleMute,
    toggleScreenShareButton,
    toggleBackgroundService,
    getAudioMetrics,
  };
}
