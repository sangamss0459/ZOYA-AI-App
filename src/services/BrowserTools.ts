import {
  ActionOverlayState,
  PendingConfirmation,
} from "../types/assistant";
import { AndroidBridge } from "./AndroidBridge";
import {
  fetchGmailMessageById,
  fetchGmailMessages,
  getCachedGmailToken,
} from "./GmailService";

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export function validateSafeUrl(rawUrl: string): string | null {
  try {
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(normalized);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export interface BrowserToolsContext {
  setActionOverlay: (state: ActionOverlayState) => void;
  setPendingConfirmation: (conf: PendingConfirmation | null) => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => Promise<void>;
  saveMemory: (category: "name" | "preference" | "context", fact: string) => boolean;
}

const APP_WEB_URLS: Record<string, { label: string; url: string }> = {
  youtube: { label: "YouTube", url: "https://www.youtube.com" },
  telegram: { label: "Telegram", url: "https://web.telegram.org" },
  gmail: { label: "Gmail", url: "https://mail.google.com" },
  browser: { label: "Google", url: "https://www.google.com" },
};

export async function executeValidatedToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: BrowserToolsContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case "openWebsite": {
      const safeUrl = validateSafeUrl(String(args.url || ""));
      const label = String(args.label || safeUrl || "Website");
      if (!safeUrl) {
        return { ok: false, error: "Blocked unsafe or invalid URL." };
      }
      if (AndroidBridge.isNativeAndroid()) {
        await AndroidBridge.openWebsite(safeUrl);
        ctx.setActionOverlay({
          kind: "app_launch",
          app: label,
          url: safeUrl,
          note: `Opened ${label} on your device.`,
        });
        return { ok: true, opened: safeUrl };
      }
      ctx.setPendingConfirmation({
        id: `open-${Date.now()}`,
        kind: "website_open",
        title: `Open ${label}?`,
        url: safeUrl,
        label,
      });
      return {
        ok: true,
        status: "prompt_displayed",
        message: `Displayed a tap-to-open card for ${label}. Ask the user to tap Open.`,
      };
    }

    case "openAndroidApp": {
      const app = String(args.app || "").toLowerCase();
      const query = args.query ? String(args.query) : undefined;

      if (app === "settings") {
        if (AndroidBridge.isNativeAndroid()) {
          await AndroidBridge.openAndroidSettings("settings");
          return { ok: true, opened: "Android Settings" };
        }
        ctx.setActionOverlay({
          kind: "app_launch",
          app: "ZOYA Settings",
          note: "Opening ZOYA Settings panel.",
        });
        return { ok: true, opened: "In-app Settings (web mode)" };
      }

      if (AndroidBridge.isNativeAndroid()) {
        const res = await AndroidBridge.openApp(app, query);
        ctx.setActionOverlay({
          kind: "app_launch",
          app: app.toUpperCase(),
          note: res.message || `Launched ${app}.`,
        });
        return res;
      }

      const webTarget = APP_WEB_URLS[app];
      if (!webTarget) {
        return { ok: false, error: `Unsupported app "${app}".` };
      }
      const targetUrl =
        app === "youtube" && query
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
          : webTarget.url;

      ctx.setActionOverlay({
        kind: "app_launch",
        app: webTarget.label,
        url: targetUrl,
        note: `Ready to open ${webTarget.label} in a browser tab.`,
      });
      return {
        ok: true,
        app: webTarget.label,
        url: targetUrl,
        message: `Displayed launch card for ${webTarget.label}.`,
      };
    }

    case "controlYouTubePlayer": {
      const action = String(args.action || "").toLowerCase();
      if (action === "close") {
        ctx.setActionOverlay({ kind: "none" });
        return { ok: true, state: "closed" };
      }
      ctx.setActionOverlay({
        kind: "app_launch",
        app: "YouTube",
        note: `YouTube player command: ${action}`,
      });
      return { ok: true, action };
    }

    case "browserAction": {
      const action = String(args.action || "");
      const target = String(args.target || "");
      const value = args.value ? String(args.value) : undefined;
      const requiresConfirmation = Boolean(args.requiresConfirmation);

      if (!["scroll", "click", "navigate", "read_page", "fill_form"].includes(action)) {
        return { ok: false, error: "Action is not in the validated allowlist." };
      }

      if (requiresConfirmation || action === "fill_form") {
        ctx.setPendingConfirmation({
          id: `act-${Date.now()}`,
          kind: "browser_sensitive",
          title: `Confirm ${action}`,
          action,
          target,
          value,
        });
        return {
          ok: true,
          status: "awaiting_user_confirmation",
          message: "Asked user for confirmation before performing this action.",
        };
      }

      if (AndroidBridge.isNativeAndroid()) {
        const nativeRes = await AndroidBridge.performAccessibilityAction(action, target, value);
        return nativeRes;
      }

      if (action === "scroll") {
        const delta = target.toLowerCase().includes("up") ? -360 : 360;
        window.scrollBy({ top: delta, behavior: "smooth" });
        return { ok: true, scrolled: delta };
      }

      if (action === "read_page") {
        const visibleText = document.body.innerText.slice(0, 1200);
        return { ok: true, visibleText };
      }

      return {
        ok: true,
        note: `Executed safe browser action "${action}" on "${target}".`,
      };
    }

    case "listGmailMessages": {
      if (!getCachedGmailToken()) {
        return {
          ok: false,
          authRequired: true,
          error: "Gmail is not authorized yet. Ask the user to tap 'Connect Gmail' first.",
        };
      }
      try {
        const messages = await fetchGmailMessages(
          String(args.query || ""),
          Number(args.maxResults) || 5
        );
        ctx.setActionOverlay({ kind: "gmail_list", messages });
        return { ok: true, count: messages.length, messages };
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to list Gmail messages.",
        };
      }
    }

    case "readGmailMessage": {
      if (!getCachedGmailToken()) {
        return {
          ok: false,
          authRequired: true,
          error: "Gmail is not authorized yet. Ask the user to tap 'Connect Gmail' first.",
        };
      }
      try {
        const message = await fetchGmailMessageById(String(args.messageId || ""));
        ctx.setActionOverlay({ kind: "gmail_read", message });
        return { ok: true, message };
      } catch (err: unknown) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to read Gmail message.",
        };
      }
    }

    case "prepareGmailSend": {
      if (!getCachedGmailToken()) {
        return {
          ok: false,
          authRequired: true,
          error: "Gmail is not authorized yet. Ask the user to tap 'Connect Gmail' first.",
        };
      }
      const to = String(args.to || "");
      const subject = String(args.subject || "");
      const body = String(args.body || "");
      ctx.setPendingConfirmation({
        id: `gmail-${Date.now()}`,
        kind: "gmail_send",
        title: "Confirm Email",
        to,
        subject,
        body,
      });
      return {
        ok: true,
        status: "awaiting_user_confirmation",
        message: "Email draft shown on screen. Tell the user to review and tap Send Email to confirm.",
      };
    }

    case "prepareTelegramMessage": {
      const recipient = String(args.recipient || "");
      const message = String(args.message || "");
      ctx.setPendingConfirmation({
        id: `tg-${Date.now()}`,
        kind: "telegram_send",
        title: "Confirm Telegram Message",
        recipient,
        message,
      });
      return {
        ok: true,
        status: "awaiting_user_confirmation",
        message: "Telegram message draft shown on screen. Tell the user to review and tap Open Telegram to send.",
      };
    }

    case "toggleScreenShare": {
      const enabled = Boolean(args.enabled);
      if (enabled) {
        const started = await ctx.startScreenShare();
        return started
          ? { ok: true, screenSharing: true, message: "Screen sharing started." }
          : { ok: false, screenSharing: false, message: "User declined or cancelled screen sharing." };
      } else {
        await ctx.stopScreenShare();
        return { ok: true, screenSharing: false, message: "Screen sharing stopped." };
      }
    }

    case "saveMemoryNote": {
      const cat = String(args.category || "context");
      const category =
        cat === "name" || cat === "preference" || cat === "context" ? cat : "context";
      const fact = String(args.fact || "");
      const saved = ctx.saveMemory(category, fact);
      return saved
        ? { ok: true, saved: true }
        : { ok: false, saved: false, reason: "Memory is disabled in user settings." };
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
