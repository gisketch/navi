import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useOvernightSummaries } from '../hooks/useOvernightSummaries';
import { ChatUI } from './ChatUI';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { LiveStatus } from './LiveStatus';
import { Dashboard } from './Dashboard';
import { BottomNavBar } from './BottomNavBar';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import type { MicMode } from '../utils/constants';
import { Navi } from './Navi';
import type { NaviState, RadialMenuState } from './Navi';
import { Mic, Radio, Fingerprint, Sparkles } from 'lucide-react';

type AppMode = 'dashboard' | 'chat';
type NavTab = 'home' | 'search' | 'notifications' | 'profile';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radialMenuState, setRadialMenuState] = useState<RadialMenuState | undefined>(undefined);
  const [spinTrigger, setSpinTrigger] = useState(0);
  
  // New: App mode (dashboard vs chat)
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Persisted settings
  const [apiKey, setApiKey] = useLocalStorage(STORAGE_KEYS.API_KEY, DEFAULT_SETTINGS.apiKey);
  const [systemInstruction, setSystemInstruction] = useLocalStorage(STORAGE_KEYS.SYSTEM_INSTRUCTION, '');
  const [micMode, setMicMode] = useLocalStorage<MicMode>(STORAGE_KEYS.MIC_MODE, DEFAULT_SETTINGS.micMode);
  const [naviBrainWebhook, setNaviBrainWebhook] = useLocalStorage(STORAGE_KEYS.NAVI_BRAIN_WEBHOOK, DEFAULT_SETTINGS.naviBrainWebhook);
  const [voiceName, setVoiceName] = useLocalStorage(STORAGE_KEYS.VOICE_NAME, DEFAULT_SETTINGS.voiceName);
  const [receiveNoteContent, setReceiveNoteContent] = useLocalStorage(STORAGE_KEYS.RECEIVE_NOTE_CONTENT, DEFAULT_SETTINGS.receiveNoteContent);

  // Overnight summaries hook
  const {
    cards,
    dailySummary,
    isLoading: summariesLoading,
    error: summariesError,
    lastUpdated,
    isMock,
    refetch: refetchSummaries,
  } = useOvernightSummaries();

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
    activeCards,
    clearCards,
  } = useGeminiLive({
    apiKey,
    systemInstruction,
    onAudioResponse: queueAudio,
    onError: (err) => setError(err.message),
    naviBrainWebhook,
    voiceName,
    receiveNoteContent,
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

  // Fetch System Prompt on Mount
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const response = await fetch('https://automate.gisketch.com/webhook/navi-prompt');
        if (!response.ok) throw new Error('Failed to fetch prompt');

        const data = await response.json();
        if (data.exists && data.content) {
          console.log('[Navi] Updated system instruction from webhook');
          setSystemInstruction(data.content);
        }
      } catch (e) {
        console.error('[Navi] Failed to fetch system prompt:', e);
      }
    };
    fetchPrompt();
  }, []);

  // Handle connection and enter chat mode
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
    
    // Enter chat mode
    setMode('chat');
  }, [apiKey, audioInitialized, initializeAudio, connect]);

  // Handle disconnect and return to dashboard
  const handleDisconnect = useCallback(() => {
    disconnect();
    stopCapture();
    stopPlayback();
    setMode('dashboard');
  }, [disconnect, stopCapture, stopPlayback]);

  // Handle main button click (different behavior per mode)
  const handleMainButtonClick = useCallback(async () => {
    if (mode === 'dashboard') {
      // Enter chat mode / connect
      await handleConnect();
    } else {
      // In chat mode - handle mic toggle
      const isConnected = connectionStatus === 'connected';
      if (!isConnected) {
        if (connectionStatus !== 'connecting') await handleConnect();
        return;
      }
      if (micMode === 'auto') {
        if (isPlaying && !isCapturing) stopPlayback();
        if (isCapturing) {
          stopCapture();
        } else {
          await startCapture();
        }
      }
    }
  }, [mode, handleConnect, connectionStatus, micMode, isPlaying, isCapturing, stopPlayback, stopCapture, startCapture]);

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

  // Get icon for main button based on state
  const getMainButtonIcon = () => {
    if (connectionStatus === 'connecting') {
      return <div className="w-6 h-6 rounded-full border-t-2 border-white/50 animate-spin" />;
    }
    if (naviState === 'listening') {
      return <Mic className="w-6 h-6 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />;
    }
    if (naviState === 'speaking') {
      return <Sparkles className="w-6 h-6 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />;
    }
    if (naviState === 'idle' || naviState === 'thinking') {
      return <Fingerprint className="w-6 h-6 text-white/80" />;
    }
    return <Radio className="w-6 h-6 text-white" />;
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="flex h-screen flex-col text-white overflow-hidden relative bg-[#050910]">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 bg-red-900/80 px-4 py-2 text-center text-sm text-red-200 backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navi - Position changes based on mode */}
      <Navi
        state={naviState}
        audioLevel={audioLevel}
        scale={mode === 'chat' ? 1 : 0.6}
        radialMenuState={mode === 'chat' ? radialMenuState : undefined}
        spinTrigger={spinTrigger}
        position={mode === 'dashboard' ? 'top-left' : 'center'}
      />

      {/* Dashboard Mode */}
      <AnimatePresence>
        {mode === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <Dashboard
              cards={cards}
              dailySummary={dailySummary}
              isLoading={summariesLoading}
              error={summariesError}
              lastUpdated={lastUpdated}
              isMock={isMock}
              onRefresh={refetchSummaries}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Mode */}
      <AnimatePresence>
        {mode === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {/* Live Status (Agentic Tools) */}
            <LiveStatus
              status={liveStatus}
              onStatusChange={() => setSpinTrigger(prev => prev + 1)}
            />

            {/* Chat area */}
            <ChatUI
              messages={messages}
              currentTurn={currentTurn}
              isCapturing={isCapturing}
              activeCards={activeCards}
              onCloseCards={clearCards}
            />

            {/* Control bar - only in chat mode */}
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
              onDisconnect={handleDisconnect}
              onRadialMenuChange={setRadialMenuState}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar - only in dashboard mode */}
      <AnimatePresence>
        {mode === 'dashboard' && (
          <BottomNavBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onMainButtonClick={handleMainButtonClick}
            mainButtonContent={getMainButtonIcon()}
            isMainButtonActive={isConnected}
          />
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        systemInstruction={systemInstruction}
        onSystemInstructionChange={setSystemInstruction}
        micMode={micMode}
        onMicModeChange={setMicMode}
        naviBrainWebhook={naviBrainWebhook}
        onNaviBrainWebhookChange={setNaviBrainWebhook}
        voiceName={voiceName}
        onVoiceNameChange={setVoiceName}
        receiveNoteContent={receiveNoteContent}
        onReceiveNoteContentChange={setReceiveNoteContent}
        onSave={() => { }}
      />
    </div>
  );
}
