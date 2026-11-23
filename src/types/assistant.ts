export type VoiceState =
  | "disconnected"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export type PreferredLanguage = "auto" | "hindi" | "hinglish" | "english";

export type ZoyaVoiceName = "Zephyr" | "Kore";

export interface MemoryItem {
  id: string;
  category: "name" | "preference" | "context";
  fact: string;
  createdAt: number;
}

export interface AssistantSettings {
  userName: string;
  preferredLanguage: PreferredLanguage;
  voiceName: ZoyaVoiceName;
  memoryEnabled: boolean;
  showLiveCaptions: boolean;
  backgroundServiceEnabled: boolean;
}

export interface WebSearchResult {
  query: string;
  summary: string;
  sources: Array<{ uri: string; title?: string }>;
}

export interface YouTubeVideoItem {
  title: string;
  channel: string;
  videoId: string;
  url: string;
}

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface GmailFullMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

export type PendingConfirmation =
  | {
      id: string;
      kind: "gmail_send";
      title: string;
      to: string;
      subject: string;
      body: string;
    }
  | {
      id: string;
      kind: "telegram_send";
      title: string;
      recipient: string;
      message: string;
    }
  | {
      id: string;
      kind: "website_open";
      title: string;
      url: string;
      label: string;
    }
  | {
      id: string;
      kind: "browser_sensitive";
      title: string;
      action: string;
      target: string;
      value?: string;
    };

export type ActionOverlayState =
  | { kind: "none" }
  | { kind: "youtube"; query: string; videos: YouTubeVideoItem[]; activeVideoId?: string; isPlaying: boolean }
  | { kind: "search"; data: WebSearchResult }
  | { kind: "gmail_list"; messages: GmailMessageSummary[] }
  | { kind: "gmail_read"; message: GmailFullMessage }
  | { kind: "app_launch"; app: string; url?: string; note: string };

export interface AndroidPermissionStatus {
  isNativeAndroid: boolean;
  microphone: boolean;
  notifications: boolean;
  accessibilityEnabled: boolean;
  screenCaptureActive: boolean;
  backgroundServiceActive: boolean;
}
