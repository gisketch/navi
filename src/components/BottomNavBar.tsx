import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, User, Bell } from 'lucide-react';
import { calculateProximityGlow, createGlowGradient, cn, glass } from '../utils/glass';

type NavTab = 'home' | 'search' | 'notifications' | 'profile';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onMainButtonClick: () => void;
  mainButtonContent: React.ReactNode;
  isMainButtonActive?: boolean;
  onMainButtonPointerDown?: (e: React.PointerEvent) => void;
  onMainButtonPointerUp?: () => void;
  naviPosition?: { x: number; y: number };
}

const NAV_ITEMS: { id: NavTab; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'search', icon: Search, label: 'Search' },
  // Main button goes in the middle
  { id: 'notifications', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function BottomNavBar({
  activeTab,
  onTabChange,
  onMainButtonClick,
  mainButtonContent,
  isMainButtonActive = false,
  onMainButtonPointerDown,
  onMainButtonPointerUp,
  naviPosition,
}: BottomNavBarProps) {
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ intensity: 0, position: { x: 50, y: 50 } });

  // Calculate glow for main button based on Navi proximity
  useEffect(() => {
    if (!mainButtonRef.current) return;
    const rect = mainButtonRef.current.getBoundingClientRect();
    const result = calculateProximityGlow(rect, naviPosition, 350);
    setGlow(result);
  }, [naviPosition]);

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
        {/* Left nav items - Icons only */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavIconButton
            key={item.id}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        {/* Center main button - Glassmorphism orb with proximity glow */}
        <div className="relative -mb-1">
          {/* Base ambient glow */}
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-2xl transition-all duration-500',
              isMainButtonActive ? 'bg-cyan-400/30 scale-150' : 'bg-cyan-400/10 scale-100'
            )}
          />

          {/* Navi proximity glow */}
          <div
            className="absolute inset-[-8px] rounded-full pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glow.intensity,
              background: createGlowGradient(glow.position, 'rgba(34, 211, 238, 0.6)'),
              filter: 'blur(8px)',
            }}
          />

          <motion.button
            ref={mainButtonRef}
            whileTap={{ scale: 0.92 }}
            onClick={onMainButtonClick}
            onPointerDown={onMainButtonPointerDown}
            onPointerUp={onMainButtonPointerUp}
            data-interactive
            className={cn(
              'relative w-[72px] h-[72px] rounded-full flex items-center justify-center',
              glass.blur.xl,
              'bg-white/[0.08]',
              'transition-all duration-300',
              isMainButtonActive
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
                background: createGlowGradient(glow.position, 'rgba(34, 211, 238, 0.3)'),
              }}
            />

            {mainButtonContent}
          </motion.button>
        </div>

        {/* Right nav items - Icons only */}
        {NAV_ITEMS.slice(2).map((item) => (
          <NavIconButton
            key={item.id}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            disabled={item.id !== 'home'}
          />
        ))}
      </div>
    </motion.nav>
  );
}

// Simple icon-only nav button (no glassmorphism container)
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
      {/* Active indicator - subtle glow below icon */}
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
