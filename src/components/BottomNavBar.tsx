import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Bell, Wallet, PenLine, Layers, Banknote, CreditCard, Receipt, Mic, MicOff, MessageSquare, X } from 'lucide-react';
import { calculateProximityGlow, createGlowGradient, cn, glass } from '../utils/glass';

type NavTab = 'home' | 'search' | 'finance' | 'notifications' | 'profile';

// Radial menu configuration - arranged in a semi-circle above the button
const RADIAL_BUTTONS = [
  { id: 'log-expense', icon: PenLine, angle: 90, label: 'Expense' }, // Top center
  { id: 'money-drop', icon: Banknote, angle: 125, label: 'Drop' }, // Top-left
  { id: 'new-debt', icon: CreditCard, angle: 155, label: 'Debt' }, // Far top-left
  { id: 'new-allocation', icon: Layers, angle: 55, label: 'Wallet' }, // Top-right
  { id: 'new-subscription', icon: Receipt, angle: 25, label: 'Bill' }, // Far top-right
];

const RADIAL_RADIUS = 150;
const HOLD_THRESHOLD = 200; // ms to trigger radial menu
const SELECTION_RADIUS = 50;

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onMainButtonClick: () => void;
  mainButtonContent: React.ReactNode;
  isMainButtonActive?: boolean;
  onMainButtonPointerDown?: (e: React.PointerEvent) => void;
  onMainButtonPointerUp?: () => void;
  naviPosition?: { x: number; y: number };
  onOpenExpenseModal?: () => void;
  onOpenMoneyDropModal?: () => void;
  onOpenTemplateModal?: () => void;
  onOpenAllocationModal?: () => void;
  onOpenDebtModal?: () => void;
  onOpenSubscriptionModal?: () => void;
  // Finance voice mode
  financeVoiceMode?: boolean;
  isCapturing?: boolean;
  onToggleCapture?: () => void;
  onMoveToChat?: () => void;
  onCloseFinanceVoice?: () => void;
}

const NAV_ITEMS: { id: NavTab; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'finance', icon: Wallet, label: 'Finance' },
  // Main button goes in the middle
  { id: 'notifications', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Logs' },
];

export function BottomNavBar({
  activeTab,
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
  }, [isFinanceTab]);

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

  // Handle main button click
  const handleMainButtonClick = useCallback(() => {
    if (radialTriggeredRef.current) return;
    onMainButtonClick();
  }, [onMainButtonClick]);

  // Determine button content based on tab
  const getButtonContent = () => {
    if (isFinanceTab) {
      return (
        <Banknote className="w-7 h-7 text-emerald-400" />
      );
    }
    return mainButtonContent;
  };

  // Finance voice mode - 3 button layout
  if (financeVoiceMode) {
    return (
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 px-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
      >
        <div className="mx-auto max-w-md flex items-center justify-center gap-6">
          {/* Move to Chat button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMoveToChat}
            data-interactive
            className={cn(
              'relative p-4 rounded-full',
              glass.blur.xl,
              'bg-white/[0.08]',
              'border border-white/[0.15]',
              'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]',
              'transition-all duration-200',
              'hover:bg-white/10 hover:border-cyan-400/30'
            )}
          >
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <MessageSquare size={24} className="text-cyan-400" />
          </motion.button>

          {/* Center Mic button */}
          <div className="relative">
            {/* Base ambient glow */}
            <div
              className={cn(
                'absolute inset-0 rounded-full blur-2xl transition-all duration-500',
                isCapturing
                  ? 'bg-amber-400/30 scale-150'
                  : 'bg-emerald-400/20 scale-100'
              )}
            />

            <motion.button
              ref={mainButtonRef}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={{ scale: 0.92 }}
              onClick={onToggleCapture}
              data-interactive
              className={cn(
                'relative w-[72px] h-[72px] rounded-full flex items-center justify-center',
                glass.blur.xl,
                'bg-white/[0.08]',
                'transition-all duration-300',
                isCapturing
                  ? 'border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
              )}
            >
              <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              {isCapturing ? (
                <Mic className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              ) : (
                <MicOff className="w-7 h-7 text-emerald-400" />
              )}
            </motion.button>
          </div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCloseFinanceVoice}
            data-interactive
            className={cn(
              'relative p-4 rounded-full',
              glass.blur.xl,
              'bg-white/[0.08]',
              'border border-white/[0.15]',
              'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]',
              'transition-all duration-200',
              'hover:bg-white/10 hover:border-red-400/30'
            )}
          >
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <X size={24} className="text-red-400" />
          </motion.button>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-6"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
    >
      <div className="mx-auto max-w-md flex items-end justify-around gap-4">
        {/* Left nav items */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavIconButton
            key={item.id}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        {/* Center main button with radial menu */}
        <div className="relative -mb-1">
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
              showRadialMenu
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
            onClick={handleMainButtonClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            data-interactive
            className={cn(
              'relative w-[72px] h-[72px] rounded-full flex items-center justify-center',
              glass.blur.xl,
              'bg-white/[0.08]',
              'transition-all duration-300',
              showRadialMenu
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

          {/* Hold hint for finance tab */}
          {isFinanceTab && !showRadialMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span className="text-[10px] text-white/30">Hold to log</span>
            </motion.div>
          )}
        </div>

        {/* Right nav items */}
        {NAV_ITEMS.slice(2).map((item) => (
          <NavIconButton
            key={item.id}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            disabled={item.id === 'notifications'} // Only notifications is disabled
          />
        ))}
      </div>
    </motion.nav>
  );
}

// Simple icon-only nav button
interface NavIconButtonProps {
  icon: typeof Home;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function NavIconButton({ icon: Icon, isActive, onClick, disabled }: NavIconButtonProps) {
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

      <Icon
        size={24}
        strokeWidth={isActive ? 2.5 : 1.5}
        className={cn(
          'relative transition-all duration-300',
          isActive
            ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
            : 'text-white/40 hover:text-white/60'
        )}
      />
    </motion.button>
  );
}
