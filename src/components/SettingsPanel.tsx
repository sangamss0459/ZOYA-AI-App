import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";
import {
  Brain,
  Download,
  Mic,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import {
  AndroidPermissionStatus,
  AssistantSettings,
  MemoryItem,
  PreferredLanguage,
  ZoyaVoiceName,
} from "../types/assistant";
import { AndroidBridge } from "../services/AndroidBridge";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<AssistantSettings>>;
  memories: MemoryItem[];
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
  gmailUser: User | null;
  gmailConnected: boolean;
  onGmailSignIn: () => void;
  onGmailSignOut: () => void;
  androidStatus: AndroidPermissionStatus;
  onToggleBackgroundService: (enabled: boolean) => void;
}

type SettingsTab = "persona" | "permissions" | "memory" | "android";

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  memories,
  onDeleteMemory,
  onClearMemories,
  gmailUser,
  gmailConnected,
  onGmailSignIn,
  onGmailSignOut,
  androidStatus,
  onToggleBackgroundService,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("persona");

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "persona", label: "Voice", icon: <Mic className="h-4 w-4" /> },
    { id: "permissions", label: "Access", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "memory", label: "Memory", icon: <Brain className="h-4 w-4" /> },
    { id: "android", label: "Android", icon: <Smartphone className="h-4 w-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl border border-white/[0.1] bg-[#0B0914] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <div className="flex items-center gap-3">
                <img
                  src="/icon-zoya.jpg"
                  alt="ZOYA AI icon"
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-xl object-cover"
                />
                <h2 className="font-display text-lg font-semibold text-white">
                  ZOYA Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="grid grid-cols-4 gap-1 border-b border-white/[0.08] bg-white/[0.02] p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-violet-600/25 text-violet-200 border border-violet-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              {activeTab === "persona" && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="zoya-username"
                      className="block text-xs font-medium text-slate-300"
                    >
                      Your Preferred Name
                    </label>
                    <input
                      id="zoya-username"
                      type="text"
                      value={settings.userName}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          userName: e.target.value,
                        }))
                      }
                      placeholder="What should ZOYA call you?"
                      className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-slate-300">
                      Conversation Language
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: "auto", label: "Auto" },
                          { id: "hinglish", label: "Hinglish" },
                          { id: "hindi", label: "Hindi" },
                          { id: "english", label: "English" },
                        ] as Array<{ id: PreferredLanguage; label: string }>
                      ).map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() =>
                            onUpdateSettings((prev) => ({
                              ...prev,
                              preferredLanguage: lang.id,
                            }))
                          }
                          className={`h-10 rounded-xl border text-xs font-medium transition-colors ${
                            settings.preferredLanguage === lang.id
                              ? "border-violet-500/60 bg-violet-600/20 text-white"
                              : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-slate-300">
                      ZOYA Voice Profile
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: "Zephyr", label: "Zephyr (Bright & Playful)" },
                          { id: "Kore", label: "Kore (Warm & Expressive)" },
                        ] as Array<{ id: ZoyaVoiceName; label: string }>
                      ).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            onUpdateSettings((prev) => ({
                              ...prev,
                              voiceName: v.id,
                            }))
                          }
                          className={`h-11 rounded-xl border px-3 text-xs font-medium transition-colors ${
                            settings.voiceName === v.id
                              ? "border-sky-500/60 bg-sky-500/15 text-white"
                              : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div>
                      <p className="text-sm font-medium text-white">Subtle Live Captions</p>
                      <p className="text-xs text-slate-400">
                        Show a single whisper line beneath the orb while talking
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.showLiveCaptions}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          showLiveCaptions: !prev.showLiveCaptions,
                        }))
                      }
                      className={`h-7 w-12 rounded-full p-1 transition-colors ${
                        settings.showLiveCaptions ? "bg-violet-600" : "bg-white/15"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.showLiveCaptions ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Gmail Access</p>
                        <p className="text-xs text-slate-400">
                          {gmailConnected && gmailUser
                            ? `Connected as ${gmailUser.email}`
                            : "Authorize Google to let ZOYA read and prepare emails with your confirmation"}
                        </p>
                      </div>
                    </div>

                    {gmailConnected ? (
                      <button
                        type="button"
                        onClick={onGmailSignOut}
                        className="h-10 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-medium text-rose-200 hover:bg-rose-500/20 transition-colors"
                      >
                        Disconnect Gmail
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onGmailSignIn}
                        className="gsi-material-button"
                      >
                        <div className="gsi-material-button-state" />
                        <div className="gsi-material-button-content-wrapper">
                          <div className="gsi-material-button-icon">
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 48 48"
                              style={{ display: "block" }}
                            >
                              <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                              />
                              <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                              />
                              <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                              />
                            </svg>
                          </div>
                          <span className="gsi-material-button-contents">
                            Sign in with Google
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Background Assistant Service
                        </p>
                        <p className="text-xs text-slate-400">
                          Keep a persistent notification control when running on Android
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.backgroundServiceEnabled}
                        onClick={() =>
                          onToggleBackgroundService(!settings.backgroundServiceEnabled)
                        }
                        className={`h-7 w-12 rounded-full p-1 transition-colors ${
                          settings.backgroundServiceEnabled ? "bg-violet-600" : "bg-white/15"
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            settings.backgroundServiceEnabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {androidStatus.isNativeAndroid && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                      <p className="text-sm font-medium text-white">
                        Android Accessibility Control
                      </p>
                      <p className="text-xs text-slate-400">
                        Status:{" "}
                        {androidStatus.accessibilityEnabled ? "Enabled" : "Not enabled"}
                      </p>
                      <button
                        type="button"
                        onClick={() => void AndroidBridge.openAndroidSettings("accessibility")}
                        className="h-10 rounded-xl bg-white/[0.08] px-4 text-xs font-medium text-white hover:bg-white/[0.15] transition-colors"
                      >
                        Open Accessibility Settings
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "memory" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Personalization Memory
                      </p>
                      <p className="text-xs text-slate-400">
                        Allow ZOYA to remember preferences across conversations
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.memoryEnabled}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          memoryEnabled: !prev.memoryEnabled,
                        }))
                      }
                      className={`h-7 w-12 rounded-full p-1 transition-colors ${
                        settings.memoryEnabled ? "bg-violet-600" : "bg-white/15"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.memoryEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Saved Memories ({memories.length})
                    </span>
                    {memories.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearMemories}
                        className="text-xs text-rose-300 hover:text-rose-200 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center text-xs text-slate-400">
                      No memories stored yet. Tell ZOYA your name or favorite vibe when talking.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((mem) => (
                        <div
                          key={mem.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400 capitalize">
                              {mem.category}
                            </p>
                            <p className="text-xs text-slate-100 mt-0.5">{mem.fact}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteMemory(mem.id)}
                            aria-label="Delete memory"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "android" && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                  <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-2.5">
                    <h3 className="text-sm font-semibold text-white">
                      GitHub ke liye Complete Project ZIP Download Karein
                    </h3>
                    <p>
                      Is ek ZIP file me aapka poora ZOYA AI code, Android Studio project, app icon,
                      aur <span className="font-mono-num text-violet-200">.github/workflows/build-android-apk.yml</span>{" "}
                      shamil hai (bina kisi API key/secret ke).
                    </p>
                    <a
                      href="/api/export-zip"
                      download="zoya-ai-github.zip"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-xs font-medium text-white hover:brightness-110 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download zoya-ai-github.zip</span>
                    </a>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">
                      1. Phone Home Screen par abhi lagayein (PWA)
                    </h3>
                    <p>
                      Android Chrome me is page ko kholen, upar 3-dot menu par tap karein aur{" "}
                      <strong className="text-white">Add to Home screen / Install App</strong>{" "}
                      chunein. ZOYA AI ek standalone app ki tarah open hogi.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">
                      2. Real Android APK &amp; Play Store AAB kaise banayein
                    </h3>
                    <p>
                      Project me poora Capacitor + Kotlin Android Studio project{" "}
                      <span className="font-mono-num text-violet-300">/android</span> folder me
                      taiyar hai (App Launcher, MediaProjection Screen Share, Foreground Service,
                      Quick Settings Tile, aur Accessibility Service ke sath).
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pt-1">
                      <li>Apne computer par Android Studio install karein.</li>
                      <li>
                        Is project ko download karke{" "}
                        <span className="font-mono-num text-slate-100">
                          npm install &amp;&amp; npm run build &amp;&amp; npx cap sync android
                        </span>{" "}
                        chalayein.
                      </li>
                      <li>
                        Android Studio me{" "}
                        <span className="font-mono-num text-slate-100">/android</span> folder
                        open karein.
                      </li>
                      <li>
                        Menu me <strong className="text-white">Build &gt; Build APK(s)</strong>{" "}
                        se installable APK banayein, ya{" "}
                        <strong className="text-white">
                          Build &gt; Generate Signed App Bundle
                        </strong>{" "}
                        se Play Store AAB banayein.
                      </li>
                    </ol>
                    <p className="text-slate-400 pt-1">
                      Poori step-by-step Hindi guide{" "}
                      <span className="font-mono-num text-slate-200">
                        ANDROID_SETUP_GUIDE_HINDI.md
                      </span>{" "}
                      file me di gayi hai.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
