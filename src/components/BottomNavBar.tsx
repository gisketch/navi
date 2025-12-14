import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Wallet, PenLine, Layers, Banknote, CreditCard, Receipt, Mic, MicOff, MessageSquare, X, Loader2, Camera, Settings, LogOut, ListTodo } from 'lucide-react';
import { calculateProximityGlow, createGlowGradient, cn, glass } from '../utils/glass';

type NavTab = 'home' | 'search' | 'finance' | 'notifications' | 'profile';
type NavMode = 'dashboard' | 'chat' | 'voice';

// Radial menu configuration - arranged in a semi-circle above the button
const RADIAL_BUTTONS = [
  { id: 'log-expense', icon: PenLine, angle: 90, label: 'Expense' }, // Top center
  { id: 'money-drop', icon: Banknote, angle: 125, label: 'Drop' }, // Top-left
  { id: 'new-debt', icon: CreditCard, angle: 155, label: 'Debt' }, // Far top-left
  { id: 'new-allocation', icon: Layers, angle: 55, label: 'Wallet' }, // Top-right
  { id: 'new-subscription', icon: Receipt, angle: 25, label: 'Bill' }, // Far top-right
];

const RADIAL_RADIUS = 120;
const HOLD_THRESHOLD = 200; // ms to trigger radial menu
const SELECTION_RADIUS = 50;

interface BottomNavBarProps {
  // Mode determines which buttons to show
  mode?: NavMode;
  // Dashboard mode props
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  // Common props
  onMainButtonClick: () => void;
  mainButtonContent: React.ReactNode;
  isMainButtonActive?: boolean;
  onMainButtonPointerDown?: (e: React.PointerEvent) => void;
  onMainButtonPointerUp?: () => void;
  naviPosition?: { x: number; y: number };
  // Dashboard: Radial menu modals
  onOpenExpenseModal?: () => void;
  onOpenMoneyDropModal?: () => void;
  onOpenTemplateModal?: () => void;
  onOpenAllocationModal?: () => void;
  onOpenDebtModal?: () => void;
  onOpenSubscriptionModal?: () => void;
  // Dashboard: Finance voice mode (overlay on dashboard)
  financeVoiceMode?: boolean;
  isCapturing?: boolean;
  onToggleCapture?: () => void;
  onMoveToChat?: () => void;
  onCloseFinanceVoice?: () => void;
  // Dashboard: Task voice mode (overlay on dashboard)
  taskVoiceMode?: boolean;
  isTaskCapturing?: boolean;
  onToggleTaskCapture?: () => void;
  onCloseTaskVoice?: () => void;
  onOpenTaskVoice?: () => void; // Long press on Focus tab Plus button
  // Dashboard: Sync status
  isSyncing?: boolean;
  // Chat mode props
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
  onOpenSettings?: () => void;
  onExitChat?: () => void;
}

export function BottomNavBar({
  mode = 'dashboard',
  activeTab = 'home',
  onTabChange,
  onMainButtonClick,
  mainButtonContent,
  isMainButtonActive = false,
  naviPosition,
  onOpenExpenseModal,
  onOpenMoneyDropModal,
  onOpenTemplateModal,
  onOpenAllocationModal,
  onOpenDebtModal,
  onOpenSubscriptionModal,
  // Finance voice mode
  financeVoiceMode = false,
  isCapturing = false,
  onToggleCapture,
  onMoveToChat,
  onCloseFinanceVoice,
  // Task voice mode
  taskVoiceMode = false,
  isTaskCapturing = false,
  onToggleTaskCapture,
  onCloseTaskVoice,
  onOpenTaskVoice,
  // Sync status
  isSyncing = false,
  // Chat mode props
  isCameraActive = false,
  onToggleCamera,
  onOpenSettings,
  onExitChat,
}: BottomNavBarProps) {
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ intensity: 0, position: { x: 50, y: 50 } });

  // Radial menu state
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [fingerOffset, setFingerOffset] = useState({ x: 0, y: 0 });
  const [hasEntered, setHasEntered] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const buttonCenterRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const radialTriggeredRef = useRef(false);

  // Check if we're on the finance tab
  const isFinanceTab = activeTab === 'finance';
  
  // Check if we're on the focus/notifications tab
  const isFocusTab = activeTab === 'notifications';

  // Calculate glow for main button based on Navi proximity
  useEffect(() => {
    if (!mainButtonRef.current) return;
    const rect = mainButtonRef.current.getBoundingClientRect();
    const result = calculateProximityGlow(rect, naviPosition, 350);
    setGlow(result);
  }, [naviPosition]);

  // Clear hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // Reset hasEntered when menu closes
  useEffect(() => {
    if (!showRadialMenu) {
      setHasEntered(false);
    }
  }, [showRadialMenu]);

  // Calculate which radial button is closest to finger position
  const getClosestButton = useCallback((fingerX: number, fingerY: number) => {
    const centerX = buttonCenterRef.current.x;
    const centerY = buttonCenterRef.current.y;

    let closestId: string | null = null;
    let closestDist = Infinity;

    // Check distance from center first - if too close, no selection
    const distFromCenter = Math.sqrt((fingerX - centerX) ** 2 + (fingerY - centerY) ** 2);
    if (distFromCenter < 40) return null;

    RADIAL_BUTTONS.forEach(btn => {
      const angleRad = (btn.angle * Math.PI) / 180;
      const btnX = centerX + Math.cos(angleRad) * RADIAL_RADIUS;
      const btnY = centerY - Math.sin(angleRad) * RADIAL_RADIUS;

      const dist = Math.sqrt((fingerX - btnX) ** 2 + (fingerY - btnY) ** 2);
      if (dist < SELECTION_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestId = btn.id;
      }
    });

    return closestId;
  }, []);

  // Execute the selected radial button action
  const executeRadialAction = useCallback((buttonId: string | null) => {
    switch (buttonId) {
      case 'log-expense':
        onOpenExpenseModal?.();
        break;
      case 'money-drop':
        onOpenMoneyDropModal?.();
        break;
      case 'new-template':
        onOpenTemplateModal?.();
        break;
      case 'new-allocation':
        onOpenAllocationModal?.();
        break;
      case 'new-debt':
        onOpenDebtModal?.();
        break;
      case 'new-subscription':
        onOpenSubscriptionModal?.();
        break;
      default:
        break;
    }
  }, [onOpenExpenseModal, onOpenMoneyDropModal, onOpenTemplateModal, onOpenAllocationModal, onOpenDebtModal, onOpenSubscriptionModal]);

  // Handle pointer down
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    startPosRef.current = { x: clientX, y: clientY };
    hasMovedRef.current = false;
    radialTriggeredRef.current = false;
    setIsHolding(true);

    if (mainButtonRef.current) {
      const rect = mainButtonRef.current.getBoundingClientRect();
      buttonCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    // Only show radial menu on finance tab
    if (isFinanceTab) {
      holdTimerRef.current = setTimeout(() => {
        radialTriggeredRef.current = true;
        setShowRadialMenu(true);
        setSelectedButton(null);
        setFingerOffset({ x: 0, y: 0 });
        setTimeout(() => setHasEntered(true), RADIAL_BUTTONS.length * 50 + 200);
      }, HOLD_THRESHOLD);
    }
    
    // On focus tab, long press opens task voice mode
    if (isFocusTab) {
      holdTimerRef.current = setTimeout(() => {
        radialTriggeredRef.current = true;
        onOpenTaskVoice?.();
      }, HOLD_THRESHOLD);
    }
  }, [isFinanceTab, isFocusTab, onOpenTaskVoice]);

  // Handle pointer move
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!showRadialMenu && !holdTimerRef.current) return;

    const dx = clientX - startPosRef.current.x;
    const dy = clientY - startPosRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      hasMovedRef.current = true;
    }

    if (showRadialMenu) {
      const closest = getClosestButton(clientX, clientY);
      setSelectedButton(closest);

      const offsetX = (clientX - buttonCenterRef.current.x) * 0.1;
      const offsetY = (clientY - buttonCenterRef.current.y) * 0.1;
      setFingerOffset({
        x: Math.max(-15, Math.min(15, offsetX)),
        y: Math.max(-15, Math.min(15, offsetY))
      });
    }
  }, [showRadialMenu, getClosestButton]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    setIsHolding(false);

    if (showRadialMenu) {
      executeRadialAction(selectedButton);
      setShowRadialMenu(false);
      setSelectedButton(null);
      setFingerOffset({ x: 0, y: 0 });
      return;
    }

    // If it was a quick tap, do normal click
    if (!radialTriggeredRef.current && !hasMovedRef.current) {
      // Normal click is handled by onClick
    }
  }, [showRadialMenu, selectedButton, executeRadialAction]);

  // Mouse/Touch handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handlePointerDown(e.clientX, e.clientY);
  }, [handlePointerDown]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handlePointerDown(touch.clientX, touch.clientY);
  }, [handlePointerDown]);

  // Global move/up handlers
  useEffect(() => {
    if (!showRadialMenu && !isHolding) return;

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onMouseUp = () => handlePointerUp();
    const onTouchEnd = () => handlePointerUp();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [showRadialMenu, isHolding, handlePointerMove, handlePointerUp]);

  // Determine button content based on tab, sync status, and voice mode
  const getButtonContent = () => {
    // Voice mode: show mic/micoff
    if (isVoiceMode) {
      if (voiceCapturing) {
        return (
          <Mic className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        );
      }
      return (
        <MicOff className={cn(
          'w-7 h-7',
          financeVoiceMode ? 'text-emerald-400' : 'text-purple-400'
        )} />
      );
    }
    // Show spinner when syncing, regardless of tab
    if (isSyncing) {
      return (
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
      );
    }
    if (isFinanceTab) {
      return (
        <Banknote className="w-7 h-7 text-emerald-400" />
      );
    }
    return mainButtonContent;
  };

  // Determine if we're in any voice mode (finance or task)
  const isVoiceMode = financeVoiceMode || taskVoiceMode;
  const voiceCapturing = financeVoiceMode ? isCapturing : isTaskCapturing;

  // Handle center button click in voice mode
  const handleCenterButtonClick = useCallback(() => {
    if (isVoiceMode) {
      if (financeVoiceMode) {
        onToggleCapture?.();
      } else if (taskVoiceMode) {
        onToggleTaskCapture?.();
      }
      return;
    }
    if (radialTriggeredRef.current) return;
    onMainButtonClick();
  }, [isVoiceMode, financeVoiceMode, taskVoiceMode, onToggleCapture, onToggleTaskCapture, onMainButtonClick]);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Center main button with radial menu - positioned ABOVE and OUTSIDE the glass container */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-50">
        {/* Radial Menu */}
        <AnimatePresence>
          {showRadialMenu && (
            <>
              {RADIAL_BUTTONS.map((btn, index) => {
                const angleRad = (btn.angle * Math.PI) / 180;
                const parallaxX = hasEntered ? fingerOffset.x : 0;
                const parallaxY = hasEntered ? fingerOffset.y : 0;
                const x = Math.cos(angleRad) * RADIAL_RADIUS + parallaxX;
                const y = -Math.sin(angleRad) * RADIAL_RADIUS + parallaxY;
                const isSelected = selectedButton === btn.id;
                const Icon = btn.icon;

                return (
                  <motion.div
                    key={btn.id}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={hasEntered ? {
                      type: 'spring',
                      stiffness: 600,
                      damping: 30,
                    } : {
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                      delay: index * 0.05,
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                  >
                    {/* Radial button with label ABOVE */}
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Label - positioned above the icon */}
                      <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: isSelected ? 1 : 0.7, y: 0 }}
                        className={cn(
                          'text-[10px] font-semibold whitespace-nowrap uppercase tracking-wider',
                          'px-2 py-0.5 rounded-full',
                          isSelected
                            ? 'text-emerald-300 bg-emerald-500/20'
                            : 'text-white/60 bg-black/30'
                        )}
                      >
                        {btn.label}
                      </motion.span>
                      {/* Icon button */}
                      <div
                        className={cn(
                          'relative w-14 h-14 rounded-full flex items-center justify-center',
                          glass.blur.xl,
                          'transition-all duration-150',
                          isSelected
                            ? 'bg-emerald-500/20 border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                            : 'bg-white/[0.08] border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
                        )}
                      >
                        <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        <Icon className={cn(
                          'w-6 h-6 relative',
                          isSelected ? 'text-emerald-400' : 'text-white/70'
                        )} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Dim overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 -z-10"
                style={{ pointerEvents: 'none' }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Base ambient glow */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-2xl transition-all duration-500',
            isVoiceMode
              ? voiceCapturing
                ? 'bg-amber-400/30 scale-150'
                : financeVoiceMode
                  ? 'bg-emerald-400/20 scale-100'
                  : 'bg-purple-400/20 scale-100'
              : showRadialMenu
                ? 'bg-emerald-400/30 scale-150'
                : isMainButtonActive
                  ? 'bg-cyan-400/30 scale-150'
                  : isFinanceTab
                    ? 'bg-emerald-400/10 scale-100'
                    : 'bg-cyan-400/10 scale-100'
          )}
        />

        {/* Navi proximity glow */}
        <div
          className="absolute inset-[-8px] rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            opacity: glow.intensity,
            background: createGlowGradient(
              glow.position,
              isFinanceTab ? 'rgba(52, 211, 153, 0.6)' : 'rgba(34, 211, 238, 0.6)'
            ),
            filter: 'blur(8px)',
          }}
        />

        <motion.button
          ref={mainButtonRef}
          whileTap={{ scale: 0.92 }}
          onClick={handleCenterButtonClick}
          onMouseDown={isVoiceMode ? undefined : handleMouseDown}
          onTouchStart={isVoiceMode ? undefined : handleTouchStart}
          data-interactive
          className={cn(
            'relative w-[72px] h-[72px] rounded-full flex items-center justify-center',
            glass.blur.xl,
            'bg-white/[0.08]',
            'transition-all duration-300',
            isVoiceMode
              ? voiceCapturing
                ? 'border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : financeVoiceMode
                  ? 'border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'border-2 border-purple-400/50 shadow-[0_0_30px_rgba(168,85,247,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
              : showRadialMenu
                ? 'border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-95'
                : isMainButtonActive
                  ? 'border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]'
          )}
        >
          {/* Inner highlight */}
          <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          {/* Navi proximity inner glow */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glow.intensity * 0.5,
              background: createGlowGradient(
                glow.position,
                isFinanceTab ? 'rgba(52, 211, 153, 0.3)' : 'rgba(34, 211, 238, 0.3)'
              ),
            }}
          />

          {getButtonContent()}
        </motion.button>
      </div>

      {/* Glassmorphism card background */}
      <div className="relative mx-3 mb-2 rounded-2xl">
        {/* Glass background with blur */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-white/[0.03] backdrop-blur-2xl',
            'border border-white/[0.08]',
            'rounded-2xl',
          )}
        />
        {/* Top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />

        {/* Nav content */}
        <div className="relative pt-3 pb-3 px-2">
          <div className="mx-auto max-w-md flex items-center justify-around gap-4">
            {/* Position 1: Home / Camera / Chat (voice mode) */}
            <NavIconButton
              key={isVoiceMode ? 'voice-chat' : mode === 'dashboard' ? 'home' : 'camera'}
              icon={isVoiceMode ? MessageSquare : mode === 'dashboard' ? Home : Camera}
              isActive={isVoiceMode ? false : mode === 'dashboard' ? activeTab === 'home' : isCameraActive}
              onClick={() => {
                if (isVoiceMode) onMoveToChat?.();
                else if (mode === 'dashboard') onTabChange?.('home');
                else onToggleCamera?.();
              }}
              mode={isVoiceMode ? 'voice' : mode}
              voiceColor={financeVoiceMode ? 'emerald' : 'purple'}
            />

            {/* Position 2: Finance / Chat / Hidden (voice mode) */}
            <NavIconButton
              key={mode === 'dashboard' ? 'finance' : 'chat'}
              icon={mode === 'dashboard' ? Wallet : MessageSquare}
              isActive={mode === 'dashboard' ? activeTab === 'finance' : false}
              onClick={() => {
                if (mode === 'dashboard') onTabChange?.('finance');
              }}
              mode={mode}
              hidden={isVoiceMode}
            />

            {/* Spacer for center button */}
            <div className="w-[72px]" />

            {/* Position 3: Focus/Tasks / Settings / Hidden (voice mode) */}
            <NavIconButton
              key={mode === 'dashboard' ? 'notifications' : 'settings'}
              icon={mode === 'dashboard' ? ListTodo : Settings}
              isActive={mode === 'dashboard' ? activeTab === 'notifications' : false}
              onClick={() => {
                if (mode === 'dashboard') onTabChange?.('notifications');
                else onOpenSettings?.();
              }}
              mode={mode}
              hidden={isVoiceMode}
            />

            {/* Position 4: Profile / Exit / Close (voice mode) */}
            <NavIconButton
              key={isVoiceMode ? 'voice-close' : mode === 'dashboard' ? 'profile' : 'exit'}
              icon={isVoiceMode ? X : mode === 'dashboard' ? User : LogOut}
              isActive={false}
              onClick={() => {
                if (financeVoiceMode) onCloseFinanceVoice?.();
                else if (taskVoiceMode) onCloseTaskVoice?.();
                else if (mode === 'dashboard') onTabChange?.('profile');
                else onExitChat?.();
              }}
              mode={isVoiceMode ? 'voice' : mode}
              voiceColor="red"
            />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// Animated icon button with spin transition on mode change
interface NavIconButtonProps {
  icon: typeof Home;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  mode: NavMode;
  hidden?: boolean;
  voiceColor?: 'emerald' | 'purple' | 'red' | 'cyan';
}

function NavIconButton({ icon: Icon, isActive, onClick, disabled, mode, hidden, voiceColor }: NavIconButtonProps) {
  // Hidden buttons are invisible but maintain layout space
  if (hidden) {
    return <div className="p-3 w-[48px]" />;
  }

  // Get color for voice mode buttons
  const getVoiceColor = () => {
    switch (voiceColor) {
      case 'emerald': return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
      case 'purple': return 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]';
      case 'red': return 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]';
      case 'cyan': return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]';
      default: return 'text-white/60';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      data-interactive
      className={cn(
        'relative p-3 transition-all duration-300',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="navIndicator"
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="w-10 h-10 rounded-full bg-cyan-400/20 blur-lg" />
        </motion.div>
      )}

      {/* Spinning icon transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${Icon.displayName || Icon.name}`}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Icon
            size={24}
            strokeWidth={mode === 'voice' ? 2 : isActive ? 2.5 : 1.5}
            className={cn(
              'relative transition-colors duration-300',
              mode === 'voice' && voiceColor
                ? getVoiceColor()
                : isActive
                  ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                  : 'text-white/40 hover:text-white/60'
            )}
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
