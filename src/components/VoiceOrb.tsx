import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { VoiceState } from "../types/assistant";

interface VoiceOrbProps {
  voiceState: VoiceState;
  isMuted: boolean;
  getAudioMetrics: () => { micLevel: number; outputLevel: number };
  onOrbTap?: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  voiceState,
  isMuted,
  getAudioMetrics,
  onOrbTap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let smoothMic = 0;
    let smoothOut = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 320;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const { micLevel, outputLevel } = getAudioMetrics();
      smoothMic += (micLevel - smoothMic) * 0.22;
      smoothOut += (outputLevel - smoothOut) * 0.24;

      const activeEnergy =
        voiceState === "speaking"
          ? Math.max(0.18, smoothOut)
          : voiceState === "listening" && !isMuted
            ? Math.max(0.08, smoothMic)
            : voiceState === "connecting"
              ? 0.14
              : 0.04;

      phase += voiceState === "speaking" ? 0.055 : voiceState === "connecting" ? 0.04 : 0.018;

      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      // Ambient outer radial bloom
      const bloomRadius = 112 + activeEnergy * 42;
      const bloom = ctx.createRadialGradient(cx, cy, 18, cx, cy, bloomRadius);
      if (voiceState === "error") {
        bloom.addColorStop(0, "rgba(244, 63, 94, 0.35)");
        bloom.addColorStop(0.55, "rgba(190, 18, 60, 0.12)");
        bloom.addColorStop(1, "rgba(5, 4, 10, 0)");
      } else if (voiceState === "speaking") {
        bloom.addColorStop(0, "rgba(139, 92, 246, 0.45)");
        bloom.addColorStop(0.5, "rgba(56, 189, 248, 0.22)");
        bloom.addColorStop(1, "rgba(5, 4, 10, 0)");
      } else {
        bloom.addColorStop(0, "rgba(124, 58, 237, 0.32)");
        bloom.addColorStop(0.55, "rgba(59, 130, 246, 0.14)");
        bloom.addColorStop(1, "rgba(5, 4, 10, 0)");
      }
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx, cy, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      // Organic harmonic acoustic rings (3 layered curves)
      const layers = voiceState === "speaking" ? 3 : 2;
      for (let l = 0; l < layers; l++) {
        const baseR = 68 + l * 14 + activeEnergy * (18 + l * 10);
        const points = 72;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const harmonic1 = Math.sin(angle * (3 + l) + phase * (1.2 + l * 0.4));
          const harmonic2 = Math.cos(angle * (5 - l) - phase * 1.6);
          const wobble =
            (harmonic1 * 0.6 + harmonic2 * 0.4) *
            (voiceState === "disconnected" ? 2.5 : 4 + activeEnergy * 24);
          const r = baseR + wobble;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (voiceState === "error") {
          ctx.strokeStyle = `rgba(251, 113, 133, ${0.42 - l * 0.12})`;
        } else if (l % 2 === 0) {
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.48 - l * 0.12})`;
        } else {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.42 - l * 0.1})`;
        }
        ctx.lineWidth = l === 0 ? 1.8 : 1.2;
        ctx.stroke();
      }

      // Central luminous core sphere
      const coreR = 54 + activeEnergy * 16;
      const coreGrad = ctx.createRadialGradient(
        cx - coreR * 0.28,
        cy - coreR * 0.28,
        coreR * 0.1,
        cx,
        cy,
        coreR
      );
      if (voiceState === "error") {
        coreGrad.addColorStop(0, "rgba(254, 205, 211, 0.92)");
        coreGrad.addColorStop(0.45, "rgba(225, 29, 72, 0.78)");
        coreGrad.addColorStop(1, "rgba(76, 5, 25, 0.92)");
      } else if (voiceState === "speaking") {
        coreGrad.addColorStop(0, "rgba(224, 242, 254, 0.95)");
        coreGrad.addColorStop(0.35, "rgba(139, 92, 246, 0.85)");
        coreGrad.addColorStop(0.75, "rgba(37, 99, 235, 0.78)");
        coreGrad.addColorStop(1, "rgba(15, 12, 36, 0.95)");
      } else {
        coreGrad.addColorStop(0, "rgba(196, 181, 253, 0.88)");
        coreGrad.addColorStop(0.42, "rgba(109, 40, 217, 0.78)");
        coreGrad.addColorStop(0.82, "rgba(30, 58, 138, 0.75)");
        coreGrad.addColorStop(1, "rgba(9, 7, 22, 0.96)");
      }

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle listening waveform bars inside core when listening
      if (voiceState === "listening") {
        const barCount = 9;
        const spacing = 7;
        const startX = cx - ((barCount - 1) * spacing) / 2;
        for (let b = 0; b < barCount; b++) {
          const distCenter = 1 - Math.abs(b - 4) / 4.5;
          const wave = Math.abs(Math.sin(phase * 2.5 + b * 0.65));
          const barH = isMuted
            ? 3
            : 4 + (smoothMic * 26 + wave * 6) * distCenter;
          ctx.fillStyle = isMuted
            ? "rgba(248, 250, 252, 0.35)"
            : "rgba(248, 250, 252, 0.85)";
          ctx.beginPath();
          ctx.roundRect(startX + b * spacing - 1.5, cy - barH / 2, 3, barH, 1.5);
          ctx.fill();
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [voiceState, isMuted, getAudioMetrics]);

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Rotating orbital ring for CONNECTING state */}
      {voiceState === "connecting" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
          className="pointer-events-none absolute h-64 w-64 rounded-full border border-transparent border-t-sky-400/80 border-r-violet-500/50"
        />
      )}

      {/* Secondary subtle counter-ring */}
      {(voiceState === "connecting" || voiceState === "speaking") && (
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 5.5, ease: "linear" }}
          className="pointer-events-none absolute h-72 w-72 rounded-full border border-dashed border-violet-400/20"
        />
      )}

      <button
        type="button"
        onClick={onOrbTap}
        aria-label={
          voiceState === "disconnected"
            ? "Start talking with ZOYA"
            : "Toggle ZOYA voice connection"
        }
        className="group relative flex h-80 w-80 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-4 active:scale-[0.98] transition-transform"
      >
        <canvas
          ref={canvasRef}
          className="h-80 w-80 pointer-events-none"
        />
      </button>
    </div>
  );
};
