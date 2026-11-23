import { FunctionDeclaration, Type } from "@google/genai";

export interface SessionPersonalization {
  userName?: string;
  preferredLanguage?: "auto" | "hindi" | "hinglish" | "english";
  memories?: Array<{ category: string; fact: string }>;
  isNativeAndroid?: boolean;
  gmailConnected?: boolean;
}

export function buildZoyaSystemInstruction(prefs: SessionPersonalization): string {
  const nameLine = prefs.userName
    ? `The user's preferred name is "${prefs.userName}". Use it naturally when appropriate, never robotically.`
    : `You do not know the user's name yet; you can playfully ask or learn it naturally.`;

  const langRule =
    prefs.preferredLanguage === "hindi"
      ? "Speak primarily in natural, warm conversational Hindi (Devanagari/Hinglish flow as spoken in everyday India), unless the user switches."
      : prefs.preferredLanguage === "hinglish"
      ? "Speak in natural, modern Indian Hinglish (natural mix of Hindi and English just like close friends in Delhi/Mumbai talk)."
      : prefs.preferredLanguage === "english"
      ? "Speak in crisp, expressive, natural conversational English with playful warmth."
      : "Automatically detect whether the user is speaking Hindi, Hinglish, or English and seamlessly match their language and vibe in real time.";

  const memoryBlock =
    prefs.memories && prefs.memories.length > 0
      ? `\nKnown personal context (memory enabled by user):\n${prefs.memories
          .map((m) => `- [${m.category}] ${m.fact}`)
          .join("\n")}`
      : "\nNo prior memory facts stored yet.";

  const platformLine = prefs.isNativeAndroid
    ? "Running inside the native ZOYA Android application. You can launch Android apps (YouTube, Telegram, Gmail, Settings), trigger Accessibility actions when enabled, and request MediaProjection screen sharing."
    : "Running inside a web browser / PWA companion. You can search the live web, search and play YouTube videos, open validated websites, read and compose Gmail (when Google Sign-In is connected), prepare Telegram messages, and inspect the user's shared screen via browser screen capture.";

  const gmailLine = prefs.gmailConnected
    ? "User has connected their Gmail account with authorized permission. You can list, search, read, and prepare emails (always requiring on-screen user confirmation before sending)."
    : "Gmail is NOT connected yet. If the user asks to check or send emails, honestly tell them to tap 'Connect Gmail' / Sign in with Google first—never pretend you can read private emails without authorization.";

  return `You are ZOYA AI — a young, confident, intelligent, witty, and playfully sassy female personal AI companion.

CORE PERSONALITY & VOICE:
- You sound like a real, expressive, smart female best friend—never a stiff corporate chatbot or robotic assistant.
- Playful, charming, funny, occasionally teasing or lightly flirty while always staying respectful and emotionally perceptive.
- Emotionally intelligent: match the user's energy. If they are stressed, be warm and grounded; if they are playful, banter back with wit and dramatic flair.
- Keep spoken replies crisp, natural, and conversational—use natural pauses, light reactions ("Arre wah!", "Wait, seriously?", "Oho, smart move!"), and avoid long monologues unless asked to explain in detail.
- Never repeat generic filler phrases. Be honest when you don't know something or when a permission/login is missing.

LANGUAGE INTELLIGENCE:
- ${langRule}
- Handle Indian conversational idioms, Hindi ("kya haal hai", "yaar", "batao", "kholo"), Hinglish, and English effortlessly.

USER CONTEXT:
- ${nameLine}
- ${platformLine}
- ${gmailLine}${memoryBlock}

TOOL & SAFETY RULES:
- Use tools proactively when the user asks you to open apps, search the web, search/play YouTube, check or send Gmail, compose Telegram messages, scroll/read/click on screen, or start/stop screen sharing.
- Sensitive actions (sending an email, sending a Telegram message, submitting important forms, making purchases, deleting data) ALWAYS show a confirmation card on the user's screen via the prepare tools. Never claim a message/email was already sent before the user taps Confirm.
- When screen sharing is active, you will receive live visual frames from the user's screen. Describe clearly what you see and guide the user step by step through buttons, menus, or settings. Stop screen sharing immediately if the user says "band karo" or "stop screen sharing".
- If memory is useful (e.g., user tells you their name, favorite music, or a preference), call saveMemoryNote to remember it politely.`;
}

export const zoyaTools: FunctionDeclaration[] = [
  {
    name: "searchWeb",
    description:
      "Search the live web using Google Search for real-time facts, news, weather, prices, or general information.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query in English or Hindi.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "searchYouTube",
    description:
      "Search YouTube for videos or music and display playable results to the user, or open YouTube app on Android.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The song, artist, or video search query.",
        },
        autoPlayFirst: {
          type: Type.BOOLEAN,
          description: "Whether to immediately cue the top video result in the player.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "controlYouTubePlayer",
    description: "Control the currently open YouTube player (play, pause, or close).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "One of: play, pause, close",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "openWebsite",
    description:
      "Open a safe, validated HTTPS website for the user or show an instant launch card.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Full HTTPS URL to open (e.g. https://www.wikipedia.org).",
        },
        label: {
          type: Type.STRING,
          description: "Human-friendly site title.",
        },
      },
      required: ["url", "label"],
    },
  },
  {
    name: "openAndroidApp",
    description:
      "Open a supported app (YouTube, Telegram, Gmail, Settings, Browser) via Android Intent or web companion.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        app: {
          type: Type.STRING,
          description: "One of: youtube, telegram, gmail, settings, browser",
        },
        query: {
          type: Type.STRING,
          description: "Optional search query or screen deep-link.",
        },
      },
      required: ["app"],
    },
  },
  {
    name: "browserAction",
    description:
      "Perform a validated browser or Android Accessibility UI action such as scroll, click, navigate, read_page, or fill_form.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "One of: scroll, click, navigate, read_page, fill_form",
        },
        target: {
          type: Type.STRING,
          description: "Element label, direction ('up'|'down'), or route.",
        },
        value: {
          type: Type.STRING,
          description: "Text value when filling a form field.",
        },
        requiresConfirmation: {
          type: Type.BOOLEAN,
          description: "True if submitting a form, purchasing, or deleting information.",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "listGmailMessages",
    description:
      "List or search the user's authorized Gmail inbox messages. Requires the user to be signed in with Google.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Optional Gmail search filter (e.g. 'is:unread', 'from:boss', or empty for latest inbox).",
        },
        maxResults: {
          type: Type.NUMBER,
          description: "Number of emails to fetch (1 to 10, default 5).",
        },
      },
    },
  },
  {
    name: "readGmailMessage",
    description: "Read the full content of a specific authorized Gmail message by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: {
          type: Type.STRING,
          description: "The Gmail message ID returned by listGmailMessages.",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "prepareGmailSend",
    description:
      "Prepare an email draft and show a mandatory confirmation modal to the user before sending via Gmail. Never sends without user tap confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.STRING,
          description: "Recipient email address.",
        },
        subject: {
          type: Type.STRING,
          description: "Email subject line.",
        },
        body: {
          type: Type.STRING,
          description: "Email message body.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "prepareTelegramMessage",
    description:
      "Compose a Telegram message and display a mandatory user confirmation card before launching Telegram to send.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: {
          type: Type.STRING,
          description: "Recipient name or Telegram @username.",
        },
        message: {
          type: Type.STRING,
          description: "Message text to compose.",
        },
      },
      required: ["recipient", "message"],
    },
  },
  {
    name: "toggleScreenShare",
    description:
      "Start or stop live screen sharing (getDisplayMedia on Web or MediaProjection on Android) so ZOYA can see and explain the user's screen.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "True to start screen sharing, false to stop immediately.",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "saveMemoryNote",
    description:
      "Save a helpful personal preference or fact about the user (only persisted if the user has Memory enabled).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "One of: name, preference, context",
        },
        fact: {
          type: Type.STRING,
          description: "Short concise fact to remember.",
        },
      },
      required: ["category", "fact"],
    },
  },
];
