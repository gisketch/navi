import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Contexts
import { useSettings, SettingsProvider } from '../contexts/SettingsContext';
import { useModalContext, ModalProvider } from '../contexts/ModalContext';
import { FinanceProvider, useFinanceData } from '../contexts/FinanceContext';
import { FinanceToolsProvider, useFinanceTools, type FinanceToolName, type FinanceToolArgs } from '../contexts/FinanceToolsContext';
import { TaskProvider } from '../contexts/TaskContext';
import { TaskToolsProvider, useTaskTools, type TaskToolName, type TaskToolArgs } from '../contexts/TaskToolsContext';
import { FunctionCallLogProvider } from '../contexts/FunctionCallLogContext';
import { SyncProvider, useSyncStatus } from '../contexts/SyncContext';

// Hooks
import { useOvernightSummaries } from '../hooks/useOvernightSummaries';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { useNaviState, type AppMode } from '../hooks/useNaviState';

// Components
import { ChatUI } from './ChatUI';
// ControlBar removed - now integrated into ChatUI
import { Dashboard } from './Dashboard';
import { Finance } from './Finance';
import { Focus } from './Focus';
import { Logs } from './Logs';
import { BottomNavBar } from './BottomNavBar';
import { Sidebar } from './Sidebar';
import { AnimatedBackground } from './AnimatedBackground';
import { ToastProvider, useToast } from './Toast';
import { ModalManager } from './modals/ModalManager';
import { FinanceConfirmationModal } from './modals/FinanceConfirmationModal';
import { TaskConfirmationModal } from './modals/TaskConfirmationModal';
import { FinanceVoiceOverlay } from './FinanceVoiceOverlay';
import { Navi } from './Navi';
import type { RadialMenuState, ConnectivityState } from './Navi';
import { FINANCE_ONLY_SYSTEM_PROMPT, FINANCE_SYSTEM_PROMPT, TASK_SYSTEM_PROMPT } from '../utils/tools';
import type { Allocation } from '../utils/financeTypes';

// Icons
import { Mic, Radio, Fingerprint, Sparkles, Plus } from 'lucide-react';

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
        <FunctionCallLogProvider>
          <FinanceProvider>
            <SyncWrapper />
          </FinanceProvider>
        </FunctionCallLogProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

// Wrapper to access FinanceContext for sync callbacks
function SyncWrapper() {
  const { refetch } = useFinanceData();
  const { showToast } = useToast();
  
  return (
    <SyncProvider onSyncComplete={refetch} onShowToast={showToast}>
      <TaskProvider>
        <FinanceToolsProvider>
          <TaskToolsProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </TaskToolsProvider>
        </FinanceToolsProvider>
      </TaskProvider>
    </SyncProvider>
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
    openTaskInput,
  } = useModalContext();
  const {
    pendingAction,
    executeFinanceTool,
    confirmPendingAction,
    cancelPendingAction,
    clearPendingAction,
    selectMatch,
  } = useFinanceTools();

  const {
    pendingAction: pendingTaskAction,
    executeTaskTool,
    confirmPendingAction: confirmTaskAction,
    cancelPendingAction: cancelTaskAction,
    clearPendingAction: _clearTaskAction,
    selectMatch: selectTaskMatch,
  } = useTaskTools();

  // Use sync context for connectivity status
  const { isOnline, syncStatus, hasPendingChanges } = useSyncStatus();

  // Map sync status to Navi connectivity state
  const connectivityState: ConnectivityState = 
    !isOnline ? 'offline' : 
    syncStatus === 'syncing' || hasPendingChanges ? 'syncing' : 
    'online';

  // ============================================
  // App State
  // ============================================
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [error, setError] = useState<string | null>(null);
  const [radialMenuState, _setRadialMenuState] = useState<RadialMenuState | undefined>(undefined);

  // Track Navi's position for glow effects
  const [naviPosition, setNaviPosition] = useState<{ x: number; y: number } | undefined>();

  // Track if initial data has loaded (for Navi state)
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);

  // Finance voice overlay state
  const [isFinanceVoiceActive, setIsFinanceVoiceActive] = useState(false);
  const [isConfirmationProcessing, setIsConfirmationProcessing] = useState(false);

  // Chat mode camera state (controlled by BottomNavBar in chat mode)
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Chat visibility state (for AR camera mode - hide bubbles, move Navi to corner)
  const [isChatVisible, setIsChatVisible] = useState(true);

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
  // Task Tool Handler (for voice session)
  // ============================================
  const handleTaskToolCall = useCallback(async (
    toolName: string,
    args: Record<string, any>,
    toolCallId: string
  ): Promise<{ handled: boolean; result?: string; pending?: boolean }> => {
    console.log('[App] Task tool call:', toolName, args);

    const result = await executeTaskTool(
      toolName as TaskToolName,
      args as TaskToolArgs[TaskToolName],
      toolCallId
    );

    if (result.needsConfirmation) {
      setPendingToolInfo({ toolCallId, toolName });
      return { handled: true, pending: true };
    }

    return { handled: true, result: result.result };
  }, [executeTaskTool]);

  // ============================================
  // Combined External Tool Handler
  // ============================================
  const TASK_TOOL_NAMES = ['get_tasks', 'get_current_task', 'add_task', 'start_task', 'complete_task', 'pause_task'];
  
  const handleExternalToolCall = useCallback(async (
    toolName: string,
    args: Record<string, any>,
    toolCallId: string
  ): Promise<{ handled: boolean; result?: string; pending?: boolean }> => {
    // Check if it's a task tool
    if (TASK_TOOL_NAMES.includes(toolName)) {
      return handleTaskToolCall(toolName, args, toolCallId);
    }
    // Otherwise, it's a finance tool
    return handleFinanceToolCall(toolName, args, toolCallId);
  }, [handleTaskToolCall, handleFinanceToolCall]);

  // ============================================
  // Voice Session (Main Chat)
  // ============================================
  const voiceSession = useVoiceSession({
    apiKey: settings.apiKey,
    systemInstruction: settings.systemInstruction + '\n\n' + FINANCE_SYSTEM_PROMPT + '\n\n' + TASK_SYSTEM_PROMPT,
    naviBrainWebhook: settings.naviBrainWebhook,
    voiceName: settings.voiceName,
    receiveNoteContent: settings.receiveNoteContent,
    onError: (err) => setError(err),
    onExternalToolCall: handleExternalToolCall,
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
    onExternalToolCall: handleExternalToolCall,
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

  // Handle online/offline toasts
  useEffect(() => {
    if (!isOnline) {
      showToast('You are offline. AI features disabled.', 'info');
      // Disconnect if currently connected
      if (voiceSession.isConnected) {
        voiceSession.disconnect();
        setMode('dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, showToast]); // Removed voiceSession to prevent infinite loops

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
    if (!isOnline) {
      showToast('Cannot connect while offline', 'error');
      return;
    }
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
    if (!isOnline) {
      showToast('Cannot connect while offline', 'error');
      return;
    }
    
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
  }, [isOnline, settings.hasApiKey, openModal, financeVoiceSession, showToast]);

  // Backup: Also try to auto-start if somehow the first attempt didn't work
  useEffect(() => {
    if (
      isFinanceVoiceActive &&
      financeVoiceSession.isConnected &&
      financeVoiceSession.audioInitialized &&
      !financeVoiceSession.isCapturing
    ) {
      // Additional fallback attempt
      const timer = setTimeout(() => {
        console.log('[App] Fallback: Auto-starting finance voice capture');
        financeVoiceSession.startCapture();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    isFinanceVoiceActive,
    financeVoiceSession.isConnected,
    financeVoiceSession.audioInitialized,
    financeVoiceSession.isCapturing,
  ]);

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

  // Handle task confirmation
  const handleTaskConfirm = useCallback(async () => {
    if (!pendingToolInfo) return;

    setIsConfirmationProcessing(true);
    try {
      const result = await confirmTaskAction();

      // Send tool response back to Gemini
      voiceSession.sendToolResponse(
        pendingToolInfo.toolCallId,
        pendingToolInfo.toolName,
        result
      );

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
  }, [pendingToolInfo, confirmTaskAction, voiceSession, showToast]);

  // Handle task cancel
  const handleTaskCancel = useCallback(() => {
    if (!pendingToolInfo) return;

    const result = cancelTaskAction();

    // Send cancellation response back to Gemini
    voiceSession.sendToolResponse(
      pendingToolInfo.toolCallId,
      pendingToolInfo.toolName,
      result
    );

    setPendingToolInfo(null);
    showToast('Action cancelled', 'info');
  }, [pendingToolInfo, cancelTaskAction, voiceSession, showToast]);

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
      // In focus/todo tab, open add task modal
      if (activeTab === 'notifications') {
        openTaskInput('work');
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
  }, [mode, activeTab, handleConnect, voiceSession, settings.micMode, openTaskInput]);

  // Get icon for main button based on state
  const getMainButtonIcon = () => {
    // In dashboard mode on Focus tab, show Plus icon for adding tasks
    if (mode === 'dashboard' && activeTab === 'notifications') {
      return <Plus className="w-6 h-6 text-white" />;
    }
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
    // Root container - flex column, full viewport height
    <div className="flex flex-col h-screen bg-black text-white">
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

      {/* Main Content Area - flex-1 takes remaining space, overflow-hidden */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Finance Voice Overlay */}
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

        {/* Navi - with connectivity state for color override */}
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
                : (isCameraActive && !isChatVisible)
                  ? 'top-right'  // AR mode with chat hidden - Navi in corner
                  : 'center'
          }
          onPositionChange={mode === 'dashboard' ? handleNaviPositionChange : undefined}
          connectivityState={connectivityState}
        />

        {/* Dashboard Mode - Tab Content */}
        <AnimatePresence mode="wait">
          {mode === 'dashboard' && activeTab === 'home' && (
            <motion.div
              key="dashboard-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
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

          {mode === 'dashboard' && activeTab === 'finance' && (
            <motion.div
              key="dashboard-finance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <Finance
                naviPosition={naviPosition}
                onPayBill={(allocation: Allocation) => openPayment(allocation, 'bill')}
                onPayDebt={(allocation: Allocation) => openPayment(allocation, 'debt')}
              />
            </motion.div>
          )}

          {mode === 'dashboard' && activeTab === 'notifications' && (
            <motion.div
              key="dashboard-focus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <Focus naviPosition={naviPosition} />
            </motion.div>
          )}

          {mode === 'dashboard' && activeTab === 'profile' && (
            <motion.div
              key="dashboard-logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
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
              className="flex-1 flex flex-col min-h-0"
            >
              <ChatUI
                messages={voiceSession.messages}
                currentTurn={voiceSession.currentTurn}
                isCapturing={voiceSession.isCapturing}
                activeCards={voiceSession.activeCards}
                onDismissCards={voiceSession.clearCards}
                naviState={naviState}
                liveStatus={voiceSession.liveStatus}
                isCameraActive={isCameraActive}
                onCameraFrame={voiceSession.sendVideo}
                isChatVisible={isChatVisible}
                onToggleChatVisible={() => setIsChatVisible(prev => !prev)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer - Bottom Nav Bar (always visible, icons animate on mode change) */}
      <footer className="lg:hidden w-full shrink-0">
        <BottomNavBar
          mode={mode === 'chat' ? 'chat' : 'dashboard'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMainButtonClick={mode === 'chat' 
            ? () => {
                if (voiceSession.isCapturing) {
                  voiceSession.stopCapture();
                } else {
                  voiceSession.startCapture();
                }
              }
            : handleMainButtonClick
          }
          mainButtonContent={mode === 'chat'
            ? (voiceSession.isCapturing ? (
                <Mic className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              ) : (
                <Mic className="w-7 h-7 text-white/70" />
              ))
            : getMainButtonIcon()
          }
          isMainButtonActive={mode === 'chat' 
            ? voiceSession.isCapturing 
            : (activeVoiceSession.isConnected || isFinanceVoiceActive)
          }
          naviPosition={naviPosition}
          onOpenExpenseModal={() => openModal('expense')}
          onOpenMoneyDropModal={() => openModal('moneyDrop')}
          onOpenTemplateModal={() => openModal('template')}
          onOpenAllocationModal={() => openModal('allocation')}
          onOpenDebtModal={() => openModal('debt')}
          onOpenSubscriptionModal={() => openModal('subscription')}
          financeVoiceMode={isFinanceVoiceActive}
          isCapturing={mode === 'chat' ? voiceSession.isCapturing : financeVoiceSession.isCapturing}
          onToggleCapture={handleFinanceVoiceMicToggle}
          onMoveToChat={handleMoveToChat}
          onCloseFinanceVoice={handleFinanceVoiceClose}
          isSyncing={syncStatus === 'syncing' || hasPendingChanges}
          isCameraActive={isCameraActive}
          onToggleCamera={() => {
            setIsCameraActive(prev => {
              // When turning camera off, restore chat visibility
              if (prev) {
                setIsChatVisible(true);
              }
              return !prev;
            });
          }}
          onOpenSettings={() => openModal('settings')}
          onExitChat={handleDisconnect}
        />
      </footer>

      {/* Modals */}
      <FinanceConfirmationModal
        isOpen={!!pendingAction}
        pendingAction={pendingAction}
        onConfirm={handleFinanceConfirm}
        onCancel={handleFinanceCancel}
        onSelectMatch={selectMatch}
        isProcessing={isConfirmationProcessing}
      />
      <TaskConfirmationModal
        isOpen={!!pendingTaskAction}
        pendingAction={pendingTaskAction}
        onConfirm={handleTaskConfirm}
        onCancel={handleTaskCancel}
        onSelectMatch={selectTaskMatch}
        isProcessing={isConfirmationProcessing}
      />
      <ModalManager />
    </div>
  );
}
