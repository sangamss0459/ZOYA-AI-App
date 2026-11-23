import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Send, ExternalLink, ShieldAlert, X } from "lucide-react";
import { PendingConfirmation } from "../types/assistant";

interface ConfirmationModalProps {
  confirmation: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  confirmation,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {confirmation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0E0C1A]/95 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 border border-violet-500/25">
                  {confirmation.kind === "gmail_send" ? (
                    <Mail className="h-5 w-5" />
                  ) : confirmation.kind === "telegram_send" ? (
                    <Send className="h-5 w-5" />
                  ) : confirmation.kind === "website_open" ? (
                    <ExternalLink className="h-5 w-5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {confirmation.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ZOYA needs your approval before proceeding
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel action"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
              {confirmation.kind === "gmail_send" && (
                <>
                  <div className="flex justify-between gap-2 text-xs text-slate-400">
                    <span>To</span>
                    <span className="text-slate-200 font-medium truncate">
                      {confirmation.to}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-xs text-slate-400">
                    <span>Subject</span>
                    <span className="text-slate-200 font-medium truncate">
                      {confirmation.subject}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.06] text-xs leading-relaxed text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {confirmation.body}
                  </div>
                </>
              )}

              {confirmation.kind === "telegram_send" && (
                <>
                  <div className="flex justify-between gap-2 text-xs text-slate-400">
                    <span>Recipient</span>
                    <span className="text-slate-200 font-medium">
                      {confirmation.recipient}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.06] text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {confirmation.message}
                  </div>
                </>
              )}

              {confirmation.kind === "website_open" && (
                <div className="text-xs text-slate-300 break-all">
                  <span className="text-slate-400 block mb-1">Destination URL</span>
                  {confirmation.url}
                </div>
              )}

              {confirmation.kind === "browser_sensitive" && (
                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-400">Action: </span>
                    {confirmation.action}
                  </div>
                  <div>
                    <span className="text-slate-400">Target: </span>
                    {confirmation.target}
                  </div>
                  {confirmation.value && (
                    <div>
                      <span className="text-slate-400">Value: </span>
                      {confirmation.value}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm font-medium text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-medium text-white hover:brightness-110 transition-all"
              >
                {confirmation.kind === "gmail_send"
                  ? "Send Email"
                  : confirmation.kind === "telegram_send"
                    ? "Open Telegram"
                    : "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
