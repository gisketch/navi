import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useOvernightSummaries } from '../hooks/useOvernightSummaries';
import { useFinanceData } from '../contexts/FinanceContext';
import { ChatUI } from './ChatUI';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { Dashboard } from './Dashboard';
import { Finance } from './Finance';
import { Logs } from './Logs';
import { BottomNavBar } from './BottomNavBar';
import { Sidebar } from './Sidebar';
import { ExpenseInputModal } from './ExpenseInputModal';
import { MoneyDropInputModal } from './MoneyDropInputModal';
import { BudgetTemplateInputModal } from './BudgetTemplateInputModal';
import { AllocationInputModal } from './AllocationInputModal';
import { DebtInputModal } from './DebtInputModal';
import { SubscriptionInputModal } from './SubscriptionInputModal';
import { ToastProvider, useToast } from './Toast';
import type { ExpenseData } from './ExpenseInputModal';
import type { MoneyDropData } from './MoneyDropInputModal';
import type { DebtData } from './DebtInputModal';
import type { SubscriptionData } from './SubscriptionInputModal';
import type { Allocation, Debt, Subscription, MoneyDrop, Transaction } from '../utils/financeTypes';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import type { MicMode } from '../utils/constants';
import { Navi } from './Navi';
import type { NaviState, RadialMenuState } from './Navi';
import { Mic, Radio, Fingerprint, Sparkles } from 'lucide-react';

type AppMode = 'dashboard' | 'chat';
type NavTab = 'home' | 'search' | 'finance' | 'notifications' | 'profile';

import { AnimatedBackground } from './AnimatedBackground';

// Main App wrapper with Toast Provider
export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [moneyDropModalOpen, setMoneyDropModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state for modals
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [editingMoneyDrop, setEditingMoneyDrop] = useState<MoneyDrop | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [radialMenuState, setRadialMenuState] = useState<RadialMenuState | undefined>(undefined);

  // Toast notifications
  const { showToast } = useToast();

  // App mode (dashboard vs chat)
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Track Navi's position for glow effects
  const [naviPosition, setNaviPosition] = useState<{ x: number; y: number } | undefined>();

  // Handle Navi position changes for card glow effects
  const handleNaviPositionChange = useCallback((pos: { x: number; y: number }) => {
    setNaviPosition(pos);
  }, []);

  // Reset naviPosition when returning to dashboard mode so glow recalculates
  useEffect(() => {
    if (mode === 'dashboard') {
      // Reset to undefined so Navi will report fresh position
      setNaviPosition(undefined);
    }
  }, [mode]);

  // Track if initial data has loaded (for Navi state)
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);

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

  // Finance data hook (for expense modal wallet options)
  const {
    livingWallet,
    playWallet,
    moneyDrops,
    activeDrops,
    budgetTemplates,
    createTransaction,
    createMoneyDrop,
    createAllocation,
    createDebt,
    createSubscription,
    updateDebt,
    updateSubscription,
    updateAllocation,
    updateMoneyDrop,
    deleteDebt,
    deleteSubscription,
    deleteAllocation,
    deleteMoneyDrop,
    deleteTransaction,
  } = useFinanceData();

  // Get active wallets for expense modal (memoized to prevent re-renders)
  const activeWallets = useMemo(
    () => [livingWallet, playWallet].filter(Boolean) as Allocation[],
    [livingWallet, playWallet]
  );

  // Handlers for Money Drop modal
  const handleMoneyDropSubmit = useCallback(async (data: MoneyDropData) => {
    try {
      await createMoneyDrop({
        name: data.name,
        amount: data.amount,
        date: data.date,
        is_received: data.is_received,
        type: data.type,
        period_start: data.period_start,
        period_end: data.period_end,
      });
      showToast(`${data.type === 'salary' ? 'Salary' : 'Extra'} drop created!`, 'success');
      setMoneyDropModalOpen(false);
    } catch (err) {
      console.error('[Finance] Failed to create money drop:', err);
      showToast('Failed to create money drop', 'error');
    }
  }, [createMoneyDrop, showToast]);

  const handleTemplateSubmit = useCallback(async (data: { name: string; allocation_rules: Record<string, number> }) => {
    // Templates are local-only for now (could store in localStorage or PocketBase later)
    showToast('Template saved!', 'success');
    setTemplateModalOpen(false);
  }, [showToast]);

  const handleAllocationSubmit = useCallback(async (data: Partial<Allocation>) => {
    try {
      await createAllocation({
        name: data.name || 'New Allocation',
        icon: data.icon || 'wallet',
        category: data.category || 'living',
        total_budget: data.total_budget || 0,
        current_balance: data.total_budget || 0, // Start with full budget
        is_strict: data.is_strict || false,
        color: data.color || 'emerald',
        money_drop_id: data.money_drop_id || '',
        daily_limit: data.daily_limit,
      });
      showToast('Allocation created!', 'success');
      setAllocationModalOpen(false);
    } catch (err) {
      console.error('[Finance] Failed to create allocation:', err);
      showToast('Failed to create allocation', 'error');
    }
  }, [createAllocation, showToast]);

  // Handle expense submission
  const handleExpenseSubmit = useCallback(async (data: ExpenseData) => {
    try {
      await createTransaction({
        amount: data.amount,
        description: data.description || 'Expense',
        timestamp: new Date().toISOString(),
        allocation_id: data.allocation_id,
        type: 'expense',
      });
      showToast(`Logged ₱${data.amount.toLocaleString()}`, 'success');
      setExpenseModalOpen(false);
    } catch (err) {
      console.error('[Finance] Failed to log expense:', err);
      showToast('Failed to log expense', 'error');
    }
  }, [createTransaction, showToast]);

  // Handle debt submission (create or update)
  const handleDebtSubmit = useCallback(async (data: DebtData) => {
    try {
      if (data.id) {
        // Update existing debt
        await updateDebt(data.id, {
          name: data.name,
          total_amount: data.total_amount,
          remaining_amount: data.remaining_amount,
          priority: data.priority,
          due_date: data.due_date,
          notes: data.notes,
        });
        showToast(`Debt "${data.name}" updated`, 'success');
      } else {
        // Create new debt
        const debt = await createDebt({
          name: data.name,
          total_amount: data.total_amount,
          remaining_amount: data.remaining_amount,
          priority: data.priority,
          due_date: data.due_date,
          notes: data.notes,
        });
        
        // If linked to money drop and create_allocation is true, create the allocation
        if (data.money_drop_id && data.create_allocation) {
          await createAllocation({
            name: `${data.name} Payment`,
            icon: 'credit-card',
            category: 'debt',
            total_budget: data.remaining_amount,
            current_balance: data.remaining_amount,
            is_strict: false,
            color: 'red',
            money_drop_id: data.money_drop_id,
            linked_debt_id: debt.id,
          });
        }
        showToast(`Debt "${data.name}" added`, 'success');
      }
      setDebtModalOpen(false);
      setEditingDebt(null);
    } catch (err) {
      console.error('[Finance] Failed to save debt:', err);
      showToast('Failed to save debt', 'error');
    }
  }, [createDebt, updateDebt, createAllocation, showToast]);

  // Handle debt delete
  const handleDebtDelete = useCallback(async (id: string) => {
    try {
      await deleteDebt(id);
      showToast('Debt deleted', 'success');
      setDebtModalOpen(false);
      setEditingDebt(null);
    } catch (err) {
      console.error('[Finance] Failed to delete debt:', err);
      showToast('Failed to delete debt', 'error');
    }
  }, [deleteDebt, showToast]);

  // Handle subscription submission (create or update)
  const handleSubscriptionSubmit = useCallback(async (data: SubscriptionData) => {
    try {
      if (data.id) {
        // Update existing subscription
        await updateSubscription(data.id, {
          name: data.name,
          amount: data.amount,
          billing_day: data.billing_day,
          category: data.category,
          is_active: data.is_active,
        });
        showToast(`"${data.name}" updated`, 'success');
      } else {
        // Create new subscription
        const subscription = await createSubscription({
          name: data.name,
          amount: data.amount,
          billing_day: data.billing_day,
          category: data.category,
          is_active: data.is_active,
        });
        
        // If linked to money drop and create_allocation is true, create the allocation
        if (data.money_drop_id && data.create_allocation) {
          await createAllocation({
            name: `${data.name} Bill`,
            icon: 'receipt',
            category: 'bills',
            total_budget: data.amount,
            current_balance: data.amount,
            is_strict: true,
            color: 'purple',
            money_drop_id: data.money_drop_id,
            linked_subscription_id: subscription.id,
          });
        }
        showToast(`"${data.name}" subscription added`, 'success');
      }
      setSubscriptionModalOpen(false);
      setEditingSubscription(null);
    } catch (err) {
      console.error('[Finance] Failed to save subscription:', err);
      showToast('Failed to save subscription', 'error');
    }
  }, [createSubscription, updateSubscription, createAllocation, showToast]);

  // Handle subscription delete
  const handleSubscriptionDelete = useCallback(async (id: string) => {
    try {
      await deleteSubscription(id);
      showToast('Subscription deleted', 'success');
      setSubscriptionModalOpen(false);
      setEditingSubscription(null);
    } catch (err) {
      console.error('[Finance] Failed to delete subscription:', err);
      showToast('Failed to delete subscription', 'error');
    }
  }, [deleteSubscription, showToast]);

  // Open edit modals from Logs page
  const handleEditDebt = useCallback((debt: Debt) => {
    setEditingDebt(debt);
    setDebtModalOpen(true);
  }, []);

  const handleEditSubscription = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    setSubscriptionModalOpen(true);
  }, []);

  const handleEditAllocation = useCallback((allocation: Allocation) => {
    setEditingAllocation(allocation);
    setAllocationModalOpen(true);
  }, []);

  const handleEditMoneyDrop = useCallback((drop: MoneyDrop) => {
    setEditingMoneyDrop(drop);
    setMoneyDropModalOpen(true);
  }, []);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    // TODO: Add transaction edit modal
    console.log('Edit transaction:', transaction);
  }, []);

  // Mark initial data as loaded when summaries finish loading
  useEffect(() => {
    if (!summariesLoading && !hasInitialDataLoaded) {
      // Small delay for visual effect
      const timer = setTimeout(() => setHasInitialDataLoaded(true), 500);
      return () => clearTimeout(timer);
    }
  }, [summariesLoading, hasInitialDataLoaded]);

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
  // In dashboard mode: offline until data loads, then idle
  // In chat mode: based on connection/audio state
  const naviState: NaviState = (() => {
    if (mode === 'dashboard') {
      // Dashboard mode: Navi is "idle" once data loads (not connected to Gemini)
      return hasInitialDataLoaded ? 'idle' : 'offline';
    }
    // Chat mode: based on actual connection state
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
    <div className="flex h-screen text-white overflow-hidden relative bg-black">
      <AnimatedBackground mode={mode} />

      {/* Desktop Sidebar - only in dashboard mode */}
      {mode === 'dashboard' && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onChatClick={handleConnect}
          onSettingsClick={() => setSettingsOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
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
          scale={1}
          radialMenuState={mode === 'chat' ? radialMenuState : undefined}
          position={mode === 'dashboard' ? 'top-right' : 'center'}
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
              <Finance naviPosition={naviPosition} />
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
                onEditDebt={handleEditDebt}
                onEditSubscription={handleEditSubscription}
                onEditAllocation={handleEditAllocation}
                onEditMoneyDrop={handleEditMoneyDrop}
                onEditTransaction={handleEditTransaction}
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
              {/* Chat area with integrated live status */}
              <ChatUI
                messages={messages}
                currentTurn={currentTurn}
                isCapturing={isCapturing}
                activeCards={activeCards}
                onDismissCards={clearCards}
                naviState={naviState}
                liveStatus={liveStatus}
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

        {/* Bottom Nav Bar - only in dashboard mode, hidden on desktop */}
        <AnimatePresence>
          {mode === 'dashboard' && (
            <div className="lg:hidden">
              <BottomNavBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMainButtonClick={handleMainButtonClick}
                mainButtonContent={getMainButtonIcon()}
                isMainButtonActive={isConnected}
                naviPosition={naviPosition}
                onOpenExpenseModal={() => setExpenseModalOpen(true)}
                onOpenMoneyDropModal={() => setMoneyDropModalOpen(true)}
                onOpenTemplateModal={() => setTemplateModalOpen(true)}
                onOpenAllocationModal={() => setAllocationModalOpen(true)}
                onOpenDebtModal={() => setDebtModalOpen(true)}
                onOpenSubscriptionModal={() => setSubscriptionModalOpen(true)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Expense input modal */}
      <ExpenseInputModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSubmit={handleExpenseSubmit}
        wallets={activeWallets}
      />

      {/* Money Drop input modal */}
      <MoneyDropInputModal
        isOpen={moneyDropModalOpen}
        onClose={() => setMoneyDropModalOpen(false)}
        onSubmit={handleMoneyDropSubmit}
        budgetTemplates={budgetTemplates}
      />

      <BudgetTemplateInputModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSubmit={handleTemplateSubmit}
      />

      <AllocationInputModal
        isOpen={allocationModalOpen}
        onClose={() => setAllocationModalOpen(false)}
        onSubmit={handleAllocationSubmit}
        moneyDrops={moneyDrops}
      />

      {/* Debt input modal */}
      <DebtInputModal
        isOpen={debtModalOpen}
        onClose={() => {
          setDebtModalOpen(false);
          setEditingDebt(null);
        }}
        onSubmit={handleDebtSubmit}
        onDelete={handleDebtDelete}
        activeDrops={activeDrops}
        editData={editingDebt}
      />

      {/* Subscription input modal */}
      <SubscriptionInputModal
        isOpen={subscriptionModalOpen}
        onClose={() => {
          setSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        onSubmit={handleSubscriptionSubmit}
        onDelete={handleSubscriptionDelete}
        activeDrops={activeDrops}
        editData={editingSubscription}
      />

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
