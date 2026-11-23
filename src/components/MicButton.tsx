import React from "react";
import { Mic, MicOff, MonitorUp, MonitorOff, PhoneOff, Sparkles } from "lucide-react";
import { VoiceState } from "../types/assistant";

interface MicButtonProps {
  voiceState: VoiceState;
  isMuted: boolean;
  isScreenSharing: boolean;
  onTogglePower: () => void;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({
  voiceState,
  isMuted,
  isScreenSharing,
  onTogglePower,
  onToggleMute,
  onToggleScreenShare,
}) => {
  const isActive = voiceState !== "disconnected" && voiceState !== "error";

  return (
    <div className="flex items-center justify-center gap-5">
      {/* Mute / Unmute button */}
      <button
        type="button"
        onClick={onToggleMute}
        disabled={!isActive}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        className={`flex h-13 w-13 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-violet-400 ${
          !isActive
            ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-slate-600"
            : isMuted
              ? "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
              : "border-white/[0.1] bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:border-white/20"
        }`}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {/* Primary Power / Talk CTA */}
      <button
        type="button"
        onClick={onTogglePower}
        aria-label={isActive ? "End voice session" : "Start voice session with ZOYA"}
        className={`relative flex h-18 w-18 items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 ${
          isActive
            ? "bg-rose-600/90 text-white shadow-[0_0_32px_rgba(225,29,72,0.45)] hover:bg-rose-500"
            : "bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_0_36px_rgba(124,58,237,0.5)] hover:brightness-110"
        }`}
      >
        {isActive ? (
          <PhoneOff className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </button>

      {/* Screen Share button */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        disabled={!isActive}
        aria-label={isScreenSharing ? "Stop screen sharing" : "Share screen with ZOYA"}
        className={`flex h-13 w-13 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-sky-400 ${
          !isActive
            ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-slate-600"
            : isScreenSharing
              ? "border-sky-400/50 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:bg-sky-500/30"
              : "border-white/[0.1] bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:border-white/20"
        }`}
      >
        {isScreenSharing ? (
          <MonitorOff className="h-5 w-5" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

// Keep unused icon tree-shaken cleanly if not needed
void Sparkles;
