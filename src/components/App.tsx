import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Contexts
import { useSettings, SettingsProvider } from '../contexts/SettingsContext';
import { useModalContext, ModalProvider } from '../contexts/ModalContext';
import { FinanceProvider } from '../contexts/FinanceContext';
import { FinanceToolsProvider, useFinanceTools, type FinanceToolName, type FinanceToolArgs } from '../contexts/FinanceToolsContext';

// Hooks
import { useOvernightSummaries } from '../hooks/useOvernightSummaries';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { useNaviState, type AppMode } from '../hooks/useNaviState';

// Components
import { ChatUI } from './ChatUI';
import { ControlBar } from './ControlBar';
import { Dashboard } from './Dashboard';
import { Finance } from './Finance';
import { Logs } from './Logs';
import { BottomNavBar } from './BottomNavBar';
import { Sidebar } from './Sidebar';
import { AnimatedBackground } from './AnimatedBackground';
import { ToastProvider, useToast } from './Toast';
import { ModalManager } from './modals/ModalManager';
import { FinanceConfirmationModal } from './modals/FinanceConfirmationModal';
import { FinanceVoiceOverlay } from './FinanceVoiceOverlay';
import { Navi } from './Navi';
import type { RadialMenuState } from './Navi';
import { FINANCE_ONLY_SYSTEM_PROMPT, FINANCE_SYSTEM_PROMPT } from '../utils/tools';
import type { Allocation } from '../utils/financeTypes';

// Icons
import { Mic, Radio, Fingerprint, Sparkles } from 'lucide-react';

// Types
type NavTab = 'home' | 'search' | 'finance' | 'notifications' | 'profile';

// ============================================
// App Entry Point
// ============================================
// Wraps the app with all required providers

export function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <FinanceProvider>
          <FinanceToolsProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </FinanceToolsProvider>
        </FinanceProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

// ============================================
// Main App Content
// ============================================

function AppContent() {
  // ============================================
  // Contexts
  // ============================================
  const settings = useSettings();
  const { showToast } = useToast();
  const {
    openModal,
    openEditDebt,
    openEditSubscription,
    openEditAllocation,
    openEditMoneyDrop,
    openEditTransaction,
    openPayment,
  } = useModalContext();
  const {
    pendingAction,
    executeFinanceTool,
    confirmPendingAction,
    cancelPendingAction,
    clearPendingAction,
  } = useFinanceTools();

  // ============================================
  // App State
  // ============================================
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [error, setError] = useState<string | null>(null);
  const [radialMenuState, setRadialMenuState] = useState<RadialMenuState | undefined>(undefined);

  // Track Navi's position for glow effects
  const [naviPosition, setNaviPosition] = useState<{ x: number; y: number } | undefined>();

  // Track if initial data has loaded (for Navi state)
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);

  // Finance voice overlay state
  const [isFinanceVoiceActive, setIsFinanceVoiceActive] = useState(false);
  const [isConfirmationProcessing, setIsConfirmationProcessing] = useState(false);

  // Pending tool info for sending response after confirmation
  const [pendingToolInfo, setPendingToolInfo] = useState<{
    toolCallId: string;
    toolName: string;
  } | null>(null);

  // ============================================
  // Data Hooks
  // ============================================
  const {
    cards,
    dailySummary,
    isLoading: summariesLoading,
    error: summariesError,
    lastUpdated,
    isMock,
    refetch: refetchSummaries,
  } = useOvernightSummaries();

  // ============================================
  // Finance Tool Handler (for voice session)
  // ============================================
  const handleFinanceToolCall = useCallback(async (
    toolName: string,
    args: Record<string, any>,
    toolCallId: string
  ): Promise<{ handled: boolean; result?: string; pending?: boolean }> => {
    console.log('[App] Finance tool call:', toolName, args);

    const result = await executeFinanceTool(
      toolName as FinanceToolName,
      args as FinanceToolArgs[FinanceToolName],
      toolCallId
    );

    if (result.needsConfirmation) {
      // Store tool info for sending response after confirmation
      setPendingToolInfo({ toolCallId, toolName });
      return { handled: true, pending: true };
    }

    return { handled: true, result: result.result };
  }, [executeFinanceTool]);

  // ============================================
  // Voice Session (Main Chat)
  // ============================================
  const voiceSession = useVoiceSession({
    apiKey: settings.apiKey,
    systemInstruction: settings.systemInstruction + '\n\n' + FINANCE_SYSTEM_PROMPT,
    naviBrainWebhook: settings.naviBrainWebhook,
    voiceName: settings.voiceName,
    receiveNoteContent: settings.receiveNoteContent,
    onError: (err) => setError(err),
    onExternalToolCall: handleFinanceToolCall,
    financeMode: false, // Full mode with all tools
  });

  // ============================================
  // Finance Voice Session (Finance Tab only)
  // ============================================
  const financeVoiceSession = useVoiceSession({
    apiKey: settings.apiKey,
    systemInstruction: FINANCE_ONLY_SYSTEM_PROMPT,
    naviBrainWebhook: settings.naviBrainWebhook,
    voiceName: settings.voiceName,
    receiveNoteContent: false, // Finance mode doesn't need notes
    onError: (err) => setError(err),
    onExternalToolCall: handleFinanceToolCall,
    financeMode: true, // Finance-only tools
  });

  // Determine which session to use for Navi state
  const activeVoiceSession = isFinanceVoiceActive ? financeVoiceSession : voiceSession;

  // ============================================
  // Navi State
  // ============================================
  const naviState = useNaviState({
    mode,
    hasInitialDataLoaded,
    isToolActive: activeVoiceSession.isToolActive,
    isPlaying: activeVoiceSession.isPlaying,
    isCapturing: activeVoiceSession.isCapturing,
    connectionStatus: activeVoiceSession.connectionStatus,
    isFinanceVoiceActive, // Pass this so Navi shows listening/speaking in finance mode
  });

  // ============================================
  // Effects
  // ============================================

  // Show settings on first load if no API key
  useEffect(() => {
    if (!settings.hasApiKey) {
      openModal('settings');
    }
  }, [settings.hasApiKey, openModal]);

  // Reset naviPosition when returning to dashboard mode so glow recalculates
  useEffect(() => {
    if (mode === 'dashboard') {
      setNaviPosition(undefined);
    }
  }, [mode]);

  // Mark initial data as loaded when summaries finish loading
  useEffect(() => {
    if (!summariesLoading && !hasInitialDataLoaded) {
      const timer = setTimeout(() => setHasInitialDataLoaded(true), 500);
      return () => clearTimeout(timer);
    }
  }, [summariesLoading, hasInitialDataLoaded]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ============================================
  // Handlers
  // ============================================

  // Handle Navi position changes for card glow effects
  const handleNaviPositionChange = useCallback((pos: { x: number; y: number }) => {
    setNaviPosition(pos);
  }, []);

  // Handle connection and enter chat mode
  const handleConnect = useCallback(async () => {
    if (!settings.hasApiKey) {
      openModal('settings');
      return;
    }

    setError(null);
    await voiceSession.connect();
    setMode('chat');
  }, [settings.hasApiKey, openModal, voiceSession]);

  // Handle disconnect and return to dashboard
  const handleDisconnect = useCallback(() => {
    voiceSession.disconnect();
    setMode('dashboard');
  }, [voiceSession]);

  // Handle finance voice overlay open
  const handleFinanceVoiceOpen = useCallback(async () => {
    if (!settings.hasApiKey) {
      openModal('settings');
      return;
    }

    console.log('[App] Opening finance voice overlay...');
    setError(null);
    try {
      console.log('[App] Connecting to Gemini Live...');
      await financeVoiceSession.connect();
      console.log('[App] Connected! Setting finance voice active...');
      setIsFinanceVoiceActive(true);

      // Wait a bit for the connection to stabilize
      console.log('[App] Waiting 600ms before starting capture...');
      await new Promise(resolve => setTimeout(resolve, 600));

      console.log('[App] Starting capture now...');
      console.log('[App] financeVoiceSession.isConnected:', financeVoiceSession.isConnected);
      console.log('[App] financeVoiceSession.audioInitialized:', financeVoiceSession.audioInitialized);

      await financeVoiceSession.startCapture();
      console.log('[App] Capture started successfully!');
    } catch (error) {
      console.error('[App] Error in handleFinanceVoiceOpen:', error);
    }
  }, [settings.hasApiKey, openModal, financeVoiceSession]);
  // Handle finance voice overlay close
  const handleFinanceVoiceClose = useCallback(() => {
    financeVoiceSession.stopCapture();
    financeVoiceSession.disconnect();
    setIsFinanceVoiceActive(false);
    clearPendingAction();
    setPendingToolInfo(null);
  }, [financeVoiceSession, clearPendingAction]);

  // Handle "Move to Chat" - transfer session text to main chat
  const handleMoveToChat = useCallback(async () => {
    // Get transcript from finance session
    const transcript = financeVoiceSession.messages
      .map(m => `${m.role === 'user' ? 'User' : 'Navi'}: ${m.text}`)
      .join('\n');

    // Close finance session
    financeVoiceSession.disconnect();
    setIsFinanceVoiceActive(false);

    // Connect to main chat if not already
    if (!voiceSession.isConnected) {
      await voiceSession.connect();
    }

    // Send transcript context as system message (via text)
    if (transcript) {
      voiceSession.sendText(`[Continuing from Finance Assistant]\n\n${transcript}\n\n[End of previous context]`);
    }

    setMode('chat');
  }, [financeVoiceSession, voiceSession]);

  // Handle finance confirmation
  const handleFinanceConfirm = useCallback(async () => {
    if (!pendingToolInfo) return;

    setIsConfirmationProcessing(true);
    try {
      const result = await confirmPendingAction();

      // Send tool response back to Gemini
      if (isFinanceVoiceActive) {
        financeVoiceSession.sendToolResponse(
          pendingToolInfo.toolCallId,
          pendingToolInfo.toolName,
          result
        );
      } else {
        voiceSession.sendToolResponse(
          pendingToolInfo.toolCallId,
          pendingToolInfo.toolName,
          result
        );
      }

      // Parse result for toast
      try {
        const parsed = JSON.parse(result);
        if (parsed.success) {
          showToast(parsed.message, 'success');
        } else if (parsed.error) {
          showToast(parsed.message || 'Action failed', 'error');
        }
      } catch {
        // Ignore JSON parse errors
      }
    } finally {
      setIsConfirmationProcessing(false);
      setPendingToolInfo(null);
    }
  }, [pendingToolInfo, confirmPendingAction, isFinanceVoiceActive, financeVoiceSession, voiceSession, showToast]);

  // Handle finance cancel
  const handleFinanceCancel = useCallback(() => {
    if (!pendingToolInfo) return;

    const result = cancelPendingAction();

    // Send cancellation response back to Gemini
    if (isFinanceVoiceActive) {
      financeVoiceSession.sendToolResponse(
        pendingToolInfo.toolCallId,
        pendingToolInfo.toolName,
        result
      );
    } else {
      voiceSession.sendToolResponse(
        pendingToolInfo.toolCallId,
        pendingToolInfo.toolName,
        result
      );
    }

    setPendingToolInfo(null);
    showToast('Action cancelled', 'info');
  }, [pendingToolInfo, cancelPendingAction, isFinanceVoiceActive, financeVoiceSession, voiceSession, showToast]);

  // Handle finance voice mic toggle
  const handleFinanceVoiceMicToggle = useCallback(async () => {
    if (financeVoiceSession.isCapturing) {
      financeVoiceSession.stopCapture();
    } else {
      await financeVoiceSession.startCapture();
    }
  }, [financeVoiceSession]);

  // Handle main button click (different behavior per mode)
  const handleMainButtonClick = useCallback(async () => {
    if (mode === 'dashboard') {
      // In finance tab, open finance voice overlay instead of full chat
      if (activeTab === 'finance') {
        await handleFinanceVoiceOpen();
        return;
      }
      await handleConnect();
    } else {
      // In chat mode - handle mic toggle
      if (!voiceSession.isConnected) {
        if (voiceSession.connectionStatus !== 'connecting') {
          await handleConnect();
        }
        return;
      }

      if (settings.micMode === 'auto') {
        if (voiceSession.isPlaying && !voiceSession.isCapturing) {
          voiceSession.stopPlayback();
        }
        if (voiceSession.isCapturing) {
          voiceSession.stopCapture();
        } else {
          await voiceSession.startCapture();
        }
      }
    }
  }, [mode, handleConnect, voiceSession, settings.micMode]);

  // Get icon for main button based on state
  const getMainButtonIcon = () => {
    if (voiceSession.connectionStatus === 'connecting') {
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

  // ============================================
  // Render
  // ============================================
  return (
    <div className="flex h-screen text-white overflow-hidden relative bg-black">
      <AnimatedBackground mode={mode} />

      {/* Desktop Sidebar - only in dashboard mode */}
      {mode === 'dashboard' && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onChatClick={handleConnect}
          onSettingsClick={() => openModal('settings')}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Finance Voice Overlay - Moved here to be in same stacking context but lower z-index than Navi */}
        <FinanceVoiceOverlay
          isOpen={isFinanceVoiceActive}
          currentTurn={financeVoiceSession.currentTurn}
          liveStatus={financeVoiceSession.liveStatus}
          naviPosition={naviPosition}
          naviState={naviState}
        />

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

        {/* Navi - Position changes based on mode and finance voice active */}
        <Navi
          state={naviState}
          audioLevel={activeVoiceSession.audioLevel}
          scale={isFinanceVoiceActive ? 1.5 : 1}
          radialMenuState={mode === 'chat' ? radialMenuState : undefined}
          position={
            isFinanceVoiceActive
              ? 'center'
              : mode === 'dashboard'
                ? 'top-right'
                : 'center'
          }
          onPositionChange={mode === 'dashboard' ? handleNaviPositionChange : undefined}
        />

        {/* Dashboard Mode - Home Tab */}
        <AnimatePresence>
          {mode === 'dashboard' && activeTab === 'home' && (
            <motion.div
              key="dashboard-home"
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
                naviPosition={naviPosition}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Mode - Finance Tab */}
        <AnimatePresence>
          {mode === 'dashboard' && activeTab === 'finance' && (
            <motion.div
              key="dashboard-finance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <Finance
                naviPosition={naviPosition}
                onPayBill={(allocation: Allocation) => openPayment(allocation, 'bill')}
                onPayDebt={(allocation: Allocation) => openPayment(allocation, 'debt')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Mode - Logs Tab (Profile) */}
        <AnimatePresence>
          {mode === 'dashboard' && activeTab === 'profile' && (
            <motion.div
              key="dashboard-logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <Logs
                naviPosition={naviPosition}
                onEditDebt={openEditDebt}
                onEditSubscription={openEditSubscription}
                onEditAllocation={openEditAllocation}
                onEditMoneyDrop={openEditMoneyDrop}
                onEditTransaction={openEditTransaction}
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
              className="flex-1 flex flex-col h-dvh"
            >
              <ChatUI
                messages={voiceSession.messages}
                currentTurn={voiceSession.currentTurn}
                isCapturing={voiceSession.isCapturing}
                activeCards={voiceSession.activeCards}
                onDismissCards={voiceSession.clearCards}
                naviState={naviState}
                liveStatus={voiceSession.liveStatus}
              />

              <ControlBar
                state={naviState}
                micMode={settings.micMode}
                connectionStatus={voiceSession.connectionStatus}
                isCapturing={voiceSession.isCapturing}
                isPlaying={voiceSession.isPlaying}
                onStartCapture={voiceSession.startCapture}
                onStopCapture={voiceSession.stopCapture}
                onSendText={voiceSession.sendText}
                onStopPlayback={voiceSession.stopPlayback}
                onOpenSettings={() => openModal('settings')}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRadialMenuChange={setRadialMenuState}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Nav Bar - only in dashboard mode, hidden on desktop */}
        <AnimatePresence>
          {mode === 'dashboard' && (
            <div className="lg:hidden">
              <BottomNavBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMainButtonClick={handleMainButtonClick}
                mainButtonContent={getMainButtonIcon()}
                isMainButtonActive={activeVoiceSession.isConnected || isFinanceVoiceActive}
                naviPosition={naviPosition}
                onOpenExpenseModal={() => openModal('expense')}
                onOpenMoneyDropModal={() => openModal('moneyDrop')}
                onOpenTemplateModal={() => openModal('template')}
                onOpenAllocationModal={() => openModal('allocation')}
                onOpenDebtModal={() => openModal('debt')}
                onOpenSubscriptionModal={() => openModal('subscription')}
                // Finance voice mode props
                financeVoiceMode={isFinanceVoiceActive}
                isCapturing={financeVoiceSession.isCapturing}
                onToggleCapture={handleFinanceVoiceMicToggle}
                onMoveToChat={handleMoveToChat}
                onCloseFinanceVoice={handleFinanceVoiceClose}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Finance Confirmation Modal */}
      <FinanceConfirmationModal
        isOpen={!!pendingAction}
        pendingAction={pendingAction}
        onConfirm={handleFinanceConfirm}
        onCancel={handleFinanceCancel}
        isProcessing={isConfirmationProcessing}
      />

      {/* All modals rendered via ModalManager */}
      <ModalManager />
    </div>
  );
}
