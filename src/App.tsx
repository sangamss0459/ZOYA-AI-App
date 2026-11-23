import { useState } from "react";
import { Mail, Settings } from "lucide-react";
import { useVoiceAssistant } from "./hooks/useVoiceAssistant";
import { VoiceOrb } from "./components/VoiceOrb";
import { StatusIndicator } from "./components/StatusIndicator";
import { MicButton } from "./components/MicButton";
import { SettingsPanel } from "./components/SettingsPanel";
import { ActionSheet } from "./components/ActionSheet";
import { ConfirmationModal } from "./components/ConfirmationModal";

export default function App() {
  const {
    voiceState,
    isMuted,
    isScreenSharing,
    errorMessage,
    liveCaption,
    settings,
    setSettings,
    memories,
    removeMemory,
    wipeAllMemories,
    actionOverlay,
    setActionOverlay,
    pendingConfirmation,
    confirmPendingAction,
    cancelPendingAction,
    gmailUser,
    gmailConnected,
    handleGmailSignIn,
    handleGmailSignOut,
    androidStatus,
    toggleVoiceConnection,
    toggleMute,
    toggleScreenShareButton,
    toggleBackgroundService,
    getAudioMetrics,
  } = useVoiceAssistant();

  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative flex min-h-dvh w-full flex-col justify-between overflow-hidden bg-[#05040A] text-slate-100">
      {/* Subtle atmospheric obsidian-violet radial light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(109,40,217,0.18),rgba(30,58,138,0.08)_42%,transparent_72%)]"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/icon-zoya.jpg"
            alt="ZOYA AI"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-xl object-cover border border-white/10"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap">
            ZOYA AI
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {!gmailConnected ? (
            <button
              type="button"
              onClick={handleGmailSignIn}
              className="flex h-10 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors whitespace-nowrap"
            >
              <Mail className="h-3.5 w-3.5 text-violet-300" />
              <span>Connect Gmail</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hidden sm:flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-slate-300 hover:bg-white/[0.07] transition-colors whitespace-nowrap"
            >
              <Mail className="h-3.5 w-3.5 text-sky-300" />
              <span className="max-w-[140px] truncate">{gmailUser?.email || "Gmail Ready"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open ZOYA settings"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1] transition-colors focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Centerpiece Voice Orb & Minimal Status */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-6">
        <VoiceOrb
          voiceState={voiceState}
          isMuted={isMuted}
          getAudioMetrics={getAudioMetrics}
          onOrbTap={toggleVoiceConnection}
        />

        <StatusIndicator
          voiceState={voiceState}
          isMuted={isMuted}
          isScreenSharing={isScreenSharing}
          errorMessage={errorMessage}
          liveCaption={liveCaption}
          showLiveCaptions={settings.showLiveCaptions}
        />
      </main>

      {/* Ergonomic Thumb-Zone Primary Controls */}
      <footer className="relative z-20 flex flex-col items-center gap-3 pb-8 pt-2 px-6">
        <MicButton
          voiceState={voiceState}
          isMuted={isMuted}
          isScreenSharing={isScreenSharing}
          onTogglePower={toggleVoiceConnection}
          onToggleMute={toggleMute}
          onToggleScreenShare={toggleScreenShareButton}
        />
        <p className="text-[11px] text-slate-500 tracking-wide text-center">
          Hindi · Hinglish · English
        </p>
      </footer>

      {/* Contextual Tool Action Sheet (YouTube / Search / Gmail / App Launch) */}
      <ActionSheet
        overlay={actionOverlay}
        onClose={() => setActionOverlay({ kind: "none" })}
        onSelectYouTubeVideo={(videoId) =>
          setActionOverlay((prev) =>
            prev.kind === "youtube"
              ? { ...prev, activeVideoId: videoId, isPlaying: true }
              : prev
          )
        }
      />

      {/* Mandatory Confirmation Dialog for Sensitive Actions */}
      <ConfirmationModal
        confirmation={pendingConfirmation}
        onConfirm={confirmPendingAction}
        onCancel={cancelPendingAction}
      />

      {/* Settings & Privacy Drawer */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        memories={memories}
        onDeleteMemory={removeMemory}
        onClearMemories={wipeAllMemories}
        gmailUser={gmailUser}
        gmailConnected={gmailConnected}
        onGmailSignIn={handleGmailSignIn}
        onGmailSignOut={handleGmailSignOut}
        androidStatus={androidStatus}
        onToggleBackgroundService={toggleBackgroundService}
      />
    </div>
  );
}
