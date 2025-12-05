import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { ChatUI } from './ChatUI';
import { ControlBar } from './ControlBar';
import { SettingsModal, SettingsButton } from './SettingsModal';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import type { MicMode } from '../utils/constants';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persisted settings
  const [apiKey, setApiKey] = useLocalStorage(STORAGE_KEYS.API_KEY, DEFAULT_SETTINGS.apiKey);
  const [micMode, setMicMode] = useLocalStorage<MicMode>(STORAGE_KEYS.MIC_MODE, DEFAULT_SETTINGS.micMode);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useLocalStorage(STORAGE_KEYS.N8N_WEBHOOK_URL, DEFAULT_SETTINGS.n8nWebhookUrl);

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
  } = useGeminiLive({
    apiKey,
    onAudioResponse: queueAudio,
    onError: (err) => setError(err.message),
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

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h1 className="text-2xl font-semibold">Navi</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection toggle */}
          <button
            onClick={connectionStatus === 'connected' ? handleDisconnect : handleConnect}
            disabled={connectionStatus === 'connecting'}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${connectionStatus === 'connected'
              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-600/20 text-yellow-400'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="h-4 w-4" />
                Connected
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Wifi className="h-4 w-4 animate-pulse" />
                Connecting...
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Chat area */}
      <ChatUI
        messages={messages}
        currentTurn={currentTurn}
        isCapturing={isCapturing}
      />

      {/* Control bar */}
      <ControlBar
        micMode={micMode}
        connectionStatus={connectionStatus}
        isCapturing={isCapturing}
        isPlaying={isPlaying}
        audioLevel={audioLevel}
        onStartCapture={startCapture}
        onStopCapture={stopCapture}
        onSendText={sendText}
        onStopPlayback={stopPlayback}
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
      />
    </div>
  );
}
