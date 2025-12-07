import { useState, useEffect, useCallback } from 'react';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { ChatUI } from './ChatUI';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { LiveStatus } from './LiveStatus';
import { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_SYSTEM_INSTRUCTION } from '../utils/constants';
import type { MicMode } from '../utils/constants';
import { Navi } from './Navi';
import type { NaviState, RadialMenuState } from './Navi';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radialMenuState, setRadialMenuState] = useState<RadialMenuState | undefined>(undefined);
  const [spinTrigger, setSpinTrigger] = useState(0);

  // Persisted settings
  const [apiKey, setApiKey] = useLocalStorage(STORAGE_KEYS.API_KEY, DEFAULT_SETTINGS.apiKey);
  const [micMode, setMicMode] = useLocalStorage<MicMode>(STORAGE_KEYS.MIC_MODE, DEFAULT_SETTINGS.micMode);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useLocalStorage(STORAGE_KEYS.N8N_WEBHOOK_URL, DEFAULT_SETTINGS.n8nWebhookUrl);
  const [saveNoteWebhook, setSaveNoteWebhook] = useLocalStorage(STORAGE_KEYS.SAVE_NOTE_WEBHOOK, DEFAULT_SETTINGS.saveNoteWebhook);
  const [searchNotesWebhook, setSearchNotesWebhook] = useLocalStorage(STORAGE_KEYS.SEARCH_NOTES_WEBHOOK, DEFAULT_SETTINGS.searchNotesWebhook);

  // Audio playback hook
  const { isPlaying, queueAudio, stopPlayback } = useAudioPlayback();

  // Gemini Live hook
  const {
    status: connectionStatus,
    messages,
    currentTurn,
    connect,
    disconnect,
    sendAudio,
    sendText,
    liveStatus,
    isToolActive,
  } = useGeminiLive({
    apiKey,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    onAudioResponse: queueAudio,
    onError: (err) => setError(err.message),
    saveNoteWebhook,
    searchNotesWebhook,
  });

  // Audio capture hook
  const {
    isCapturing,
    isInitialized: audioInitialized,
    audioLevel,
    initialize: initializeAudio,
    startCapture,
    stopCapture,
  } = useAudioCapture({
    onAudioData: sendAudio,
    onError: (err) => setError(err.message),
  });

  // Show settings on first load if no API key
  useEffect(() => {
    if (!apiKey) {
      setSettingsOpen(true);
    }
  }, [apiKey]);

  // Handle connection
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }

    setError(null);

    // Initialize audio (needs user gesture)
    if (!audioInitialized) {
      await initializeAudio();
    }

    // Connect to Gemini
    await connect();
  }, [apiKey, audioInitialized, initializeAudio, connect]);

  const handleDisconnect = useCallback(() => {
    stopCapture();
    stopPlayback();
    disconnect();
  }, [stopCapture, stopPlayback, disconnect]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Compute Navi's visual state based on app state
  const naviState: NaviState = (() => {
    if (isToolActive) return 'thinking';
    if (isPlaying) return 'speaking';
    if (isCapturing) return 'listening';
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') return 'idle';
    return 'offline';
  })();

  // Force stop capture if tool becomes active (Navi is thinking)
  useEffect(() => {
    if (isToolActive && isCapturing) {
      stopCapture();
    }
  }, [isToolActive, isCapturing, stopCapture]);

  return (
    <div className="flex h-screen flex-col text-white overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">Navi</h1>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-center text-sm text-red-200 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Navi overlay - positioned absolutely to move across entire screen */}
      <Navi
        state={naviState}
        audioLevel={audioLevel}
        scale={1.2}
        radialMenuState={radialMenuState}
        spinTrigger={spinTrigger}
      />

      {/* Live Status (Agentic Tools) - with animated word display */}
      <LiveStatus
        status={liveStatus}
        onStatusChange={() => setSpinTrigger(prev => prev + 1)}
      />

      {/* Chat area */}
      <ChatUI
        messages={messages}
        currentTurn={currentTurn}
        isCapturing={isCapturing}
      />

      {/* Control bar */}
      <ControlBar
        state={naviState}
        micMode={micMode}
        connectionStatus={connectionStatus}
        isCapturing={isCapturing}
        isPlaying={isPlaying}
        onStartCapture={startCapture}
        onStopCapture={stopCapture}
        onSendText={sendText}
        onStopPlayback={stopPlayback}
        onOpenSettings={() => setSettingsOpen(true)}
        onConnect={handleConnect}
        onRadialMenuChange={setRadialMenuState}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        micMode={micMode}
        onMicModeChange={setMicMode}
        n8nWebhookUrl={n8nWebhookUrl}
        onN8nWebhookUrlChange={setN8nWebhookUrl}
        saveNoteWebhook={saveNoteWebhook}
        onSaveNoteWebhookChange={setSaveNoteWebhook}
        searchNotesWebhook={searchNotesWebhook}
        onSearchNotesWebhookChange={setSearchNotesWebhook}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
