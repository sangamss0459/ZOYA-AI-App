import { MemoryItem, PreferredLanguage, ZoyaVoiceName } from "../types/assistant";

export interface LiveHandshakeConfig {
  voiceName: ZoyaVoiceName;
  personalization: {
    userName: string;
    preferredLanguage: PreferredLanguage;
    memories: Array<Pick<MemoryItem, "category" | "fact">>;
    isNativeAndroid: boolean;
    gmailConnected: boolean;
  };
}

export type LiveServerEvent =
  | { type: "ready" }
  | { type: "audio"; data: string }
  | { type: "interrupted" }
  | { type: "turn_complete" }
  | { type: "input_transcript"; text: string }
  | { type: "output_transcript"; text: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_event"; name: string; args: Record<string, unknown>; result: unknown }
  | { type: "error"; message: string }
  | { type: "closed" };

export class LiveSession {
  private ws: WebSocket | null = null;
  private manualClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private config: LiveHandshakeConfig | null = null;
  private onEvent: (event: LiveServerEvent) => void;
  private onStatusChange: (connected: boolean, reconnecting?: boolean) => void;

  constructor(
    onEvent: (event: LiveServerEvent) => void,
    onStatusChange: (connected: boolean, reconnecting?: boolean) => void
  ) {
    this.onEvent = onEvent;
    this.onStatusChange = onStatusChange;
  }

  connect(config: LiveHandshakeConfig): void {
    this.manualClose = false;
    this.config = config;
    this.openSocket();
  }

  private openSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChange(true, false);
      if (this.config) {
        socket.send(
          JSON.stringify({
            type: "start",
            voiceName: this.config.voiceName,
            personalization: this.config.personalization,
          })
        );
      }
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as LiveServerEvent;
        this.onEvent(parsed);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onerror = () => {
      this.onEvent({ type: "error", message: "Voice connection encountered a network issue." });
    };

    socket.onclose = () => {
      this.ws = null;
      if (this.manualClose) {
        this.onStatusChange(false, false);
        return;
      }
      if (this.reconnectAttempts < 3) {
        const delay = Math.min(1200 * Math.pow(2, this.reconnectAttempts), 6000);
        this.reconnectAttempts += 1;
        this.onStatusChange(false, true);
        this.reconnectTimer = window.setTimeout(() => {
          this.openSocket();
        }, delay);
      } else {
        this.onStatusChange(false, false);
        this.onEvent({ type: "closed" });
      }
    };
  }

  sendAudio(base64Pcm16k: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio", data: base64Pcm16k }));
    }
  }

  sendVideoFrame(base64Jpeg: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "video", data: base64Jpeg }));
    }
  }

  sendToolResponse(id: string, name: string, response: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "tool_response", id, name, response }));
    }
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.onStatusChange(false, false);
  }
}
