import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Mail, Play, Search, X } from "lucide-react";
import { ActionOverlayState } from "../types/assistant";

interface ActionSheetProps {
  overlay: ActionOverlayState;
  onClose: () => void;
  onSelectYouTubeVideo: (videoId: string) => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  overlay,
  onClose,
  onSelectYouTubeVideo,
}) => {
  return (
    <AnimatePresence>
      {overlay.kind !== "none" && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-4 bottom-32 z-30 mx-auto max-w-lg rounded-3xl border border-white/[0.12] bg-[#0D0B18]/92 backdrop-blur-xl p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
              {overlay.kind === "youtube" && <Play className="h-4 w-4 text-rose-400" />}
              {overlay.kind === "search" && <Search className="h-4 w-4 text-sky-400" />}
              {(overlay.kind === "gmail_list" || overlay.kind === "gmail_read") && (
                <Mail className="h-4 w-4 text-violet-400" />
              )}
              {overlay.kind === "app_launch" && (
                <ExternalLink className="h-4 w-4 text-violet-400" />
              )}
              <span>
                {overlay.kind === "youtube"
                  ? `YouTube · ${overlay.query}`
                  : overlay.kind === "search"
                    ? `Search · ${overlay.data.query}`
                    : overlay.kind === "gmail_list"
                      ? "Gmail Inbox"
                      : overlay.kind === "gmail_read"
                        ? overlay.message.subject
                        : overlay.app}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close action panel"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {overlay.kind === "youtube" && (
            <div className="space-y-3">
              {overlay.activeVideoId && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] aspect-video bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${encodeURIComponent(overlay.activeVideoId)}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.06]">
                {overlay.videos.map((v, idx) => (
                  <div
                    key={`${v.videoId || idx}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-100 truncate">
                        {v.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{v.channel}</p>
                    </div>
                    {v.videoId ? (
                      <button
                        type="button"
                        onClick={() => onSelectYouTubeVideo(v.videoId)}
                        className="shrink-0 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.15] transition-colors"
                      >
                        Play
                      </button>
                    ) : (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.15] transition-colors"
                      >
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {overlay.kind === "search" && (
            <div className="space-y-3 max-h-56 overflow-y-auto">
              <p className="text-xs leading-relaxed text-slate-300">
                {overlay.data.summary}
              </p>
              {overlay.data.sources.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                  {overlay.data.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs text-sky-300 hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="truncate">{src.title || src.uri}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {overlay.kind === "gmail_list" && (
            <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.06]">
              {overlay.messages.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No matching emails found.
                </p>
              ) : (
                overlay.messages.map((m) => (
                  <div key={m.id} className="py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-100 truncate">
                        {m.subject}
                      </span>
                      {m.unread && (
                        <span className="text-[11px] font-medium text-violet-300 shrink-0">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{m.from}</p>
                    <p className="text-[11px] text-slate-400/90 line-clamp-2">{m.snippet}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {overlay.kind === "gmail_read" && (
            <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
              <p className="text-slate-400">From: {overlay.message.from}</p>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap pt-2 border-t border-white/[0.06]">
                {overlay.message.body}
              </p>
            </div>
          )}

          {overlay.kind === "app_launch" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">{overlay.note}</p>
              {overlay.url && (
                <a
                  href={overlay.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-xs font-medium text-white hover:brightness-110 transition-all"
                >
                  <span>Open {overlay.app}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
