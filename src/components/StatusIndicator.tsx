import React from "react";
import { VoiceState } from "../types/assistant";

interface StatusIndicatorProps {
  voiceState: VoiceState;
  isMuted: boolean;
  isScreenSharing: boolean;
  errorMessage: string | null;
  liveCaption?: string;
  showLiveCaptions: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  voiceState,
  isMuted,
  isScreenSharing,
  errorMessage,
  liveCaption,
  showLiveCaptions,
}) => {
  const labelMap: Record<VoiceState, string> = {
    disconnected: "Tap mic to talk with ZOYA",
    connecting: "Connecting live voice...",
    listening: isMuted ? "Microphone muted" : "Listening · Speak naturally",
    speaking: "ZOYA is speaking",
    error: errorMessage || "Connection interrupted",
  };

  const accentClass =
    voiceState === "error"
      ? "text-rose-300"
      : voiceState === "speaking"
        ? "text-sky-300"
        : voiceState === "listening"
          ? "text-violet-200"
          : voiceState === "connecting"
            ? "text-indigo-300"
            : "text-slate-400";

  return (
    <div className="flex flex-col items-center gap-2 text-center px-6 max-w-md">
      <div className="flex items-center gap-2.5 text-sm font-medium tracking-wide">
        {(voiceState === "listening" || voiceState === "speaking") && (
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              voiceState === "speaking" ? "bg-sky-400 animate-pulse" : "bg-violet-400"
            }`}
          />
        )}
        <span className={accentClass}>{labelMap[voiceState]}</span>
      </div>

      {isScreenSharing && (
        <p className="text-xs text-sky-300/90 tracking-wide">
          Screen sharing active · ZOYA can see your screen
        </p>
      )}

      {showLiveCaptions && liveCaption && (
        <p className="mt-1 text-xs leading-relaxed text-slate-300/80 line-clamp-2 max-w-sm">
          {liveCaption}
        </p>
      )}
    </div>
  );
};
