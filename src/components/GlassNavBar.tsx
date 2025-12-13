import { useRef, useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateProximityGlow, createGlowGradient, cn, glass } from '../utils/glass';

// ============================================
// Types
// ============================================

export interface NavButton {
  id: string;
  icon: ReactNode;
  label?: string;
  onClick?: () => void;
  isActive?: boolean;
  activeColor?: string; // e.g., 'cyan', 'emerald', 'amber', 'red'
  disabled?: boolean;
}

export interface GlassNavBarProps {
  /** Buttons to show on the left side of the main button */
  leftButtons?: NavButton[];
  /** Buttons to show on the right side of the main button */
  rightButtons?: NavButton[];
  /** Main center button content */
  mainButtonContent: ReactNode;
  /** Main button click handler */
  onMainButtonClick?: () => void;
  /** Whether main button is in active state */
  isMainButtonActive?: boolean;
  /** Main button active color */
  mainButtonColor?: 'cyan' | 'emerald' | 'amber' | 'red';
  /** Navi position for proximity glow effect */
  naviPosition?: { x: number; y: number };
  /** Whether to show the navbar */
  visible?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================
// Color utilities
// ============================================

const colorMap = {
  cyan: {
    glow: 'rgba(34, 211, 238, 0.6)',
    bg: 'bg-cyan-400/20',
    border: 'border-cyan-400/50',
    shadow: 'shadow-[0_0_30px_rgba(34,211,238,0.3)]',
    text: 'text-cyan-400',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
  },
  emerald: {
    glow: 'rgba(52, 211, 153, 0.6)',
    bg: 'bg-emerald-400/20',
    border: 'border-emerald-400/50',
    shadow: 'shadow-[0_0_30px_rgba(52,211,153,0.3)]',
    text: 'text-emerald-400',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  },
  amber: {
    glow: 'rgba(251, 191, 36, 0.6)',
    bg: 'bg-amber-400/20',
    border: 'border-amber-400/50',
    shadow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    text: 'text-amber-400',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  },
  red: {
    glow: 'rgba(248, 113, 113, 0.6)',
    bg: 'bg-red-400/20',
    border: 'border-red-400/50',
    shadow: 'shadow-[0_0_30px_rgba(248,113,113,0.3)]',
    text: 'text-red-400',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]',
  },
};

// ============================================
// Side Button Component
// ============================================

interface SideButtonProps {
  button: NavButton;
  index: number;
  side: 'left' | 'right';
}

function SideButton({ button, index, side }: SideButtonProps) {
  const color = button.activeColor ? colorMap[button.activeColor as keyof typeof colorMap] : null;
  const isActive = button.isActive;

  return (
    <motion.button
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={button.onClick}
      disabled={button.disabled}
      data-interactive
      className={cn(
        'relative p-3 rounded-full transition-all duration-200',
        glass.blur.xl,
        'bg-white/[0.08]',
        'border',
        isActive && color
          ? `${color.border} ${color.shadow}`
          : 'border-white/[0.15]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]',
        button.disabled && 'opacity-30 cursor-not-allowed',
        !button.disabled && 'hover:bg-white/10'
      )}
    >
      {/* Inner highlight */}
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      
      {/* Icon container */}
      <div className={cn(
        'relative w-6 h-6 flex items-center justify-center',
        isActive && color ? color.text : 'text-white/70'
      )}>
        {button.icon}
      </div>
    </motion.button>
  );
}

// ============================================
// Main Component
// ============================================

export function GlassNavBar({
  leftButtons = [],
  rightButtons = [],
  mainButtonContent,
  onMainButtonClick,
  isMainButtonActive = false,
  mainButtonColor = 'cyan',
  naviPosition,
  visible = true,
  className,
}: GlassNavBarProps) {
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ intensity: 0, position: { x: 50, y: 50 } });

  const color = colorMap[mainButtonColor];

  // Calculate glow for main button based on Navi proximity
  useEffect(() => {
    if (!mainButtonRef.current || !naviPosition) return;
    const rect = mainButtonRef.current.getBoundingClientRect();
    const result = calculateProximityGlow(rect, naviPosition, 350);
    setGlow(result);
  }, [naviPosition]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40 px-4',
            className
          )}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
        >
          <div className="mx-auto max-w-md flex items-center justify-center gap-3">
            {/* Left buttons */}
            <AnimatePresence mode="popLayout">
              {leftButtons.map((button, index) => (
                <SideButton
                  key={button.id}
                  button={button}
                  index={index}
                  side="left"
                />
              ))}
            </AnimatePresence>

            {/* Main center button */}
            <div className="relative">
              {/* Base ambient glow */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full blur-2xl transition-all duration-500',
                  isMainButtonActive
                    ? `${color.bg} scale-150`
                    : 'bg-white/5 scale-100'
                )}
              />

              {/* Navi proximity glow */}
              {naviPosition && (
                <div
                  className="absolute inset-[-8px] rounded-full pointer-events-none transition-opacity duration-300"
                  style={{
                    opacity: glow.intensity,
                    background: createGlowGradient(glow.position, color.glow),
                    filter: 'blur(8px)',
                  }}
                />
              )}

              <motion.button
                ref={mainButtonRef}
                whileTap={{ scale: 0.92 }}
                onClick={onMainButtonClick}
                data-interactive
                className={cn(
                  'relative w-[72px] h-[72px] rounded-full flex items-center justify-center',
                  glass.blur.xl,
                  'bg-white/[0.08]',
                  'transition-all duration-300',
                  isMainButtonActive
                    ? `border-2 ${color.border} ${color.shadow} inset-shadow-[0_1px_1px_rgba(255,255,255,0.2)]`
                    : 'border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]'
                )}
              >
                {/* Inner highlight */}
                <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                {/* Navi proximity inner glow */}
                {naviPosition && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: glow.intensity * 0.5,
                      background: createGlowGradient(
                        glow.position,
                        color.glow.replace('0.6', '0.3')
                      ),
                    }}
                  />
                )}

                {/* Content */}
                <div className={cn(
                  'relative',
                  isMainButtonActive && color.text
                )}>
                  {mainButtonContent}
                </div>
              </motion.button>
            </div>

            {/* Right buttons */}
            <AnimatePresence mode="popLayout">
              {rightButtons.map((button, index) => (
                <SideButton
                  key={button.id}
                  button={button}
                  index={index}
                  side="right"
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
