import { motion } from 'framer-motion';
import { Home, Search, User, Bell } from 'lucide-react';

type NavTab = 'home' | 'search' | 'notifications' | 'profile';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onMainButtonClick: () => void;
  mainButtonContent: React.ReactNode;
  isMainButtonActive?: boolean;
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
}: BottomNavBarProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-4"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
    >
      <div className="mx-auto max-w-md">
        <div className="bg-[#0b1220]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-2 flex items-center justify-around">
          {/* Left nav items */}
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}

          {/* Center main button - pass through the control bar button */}
          <div className="relative -mt-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onMainButtonClick}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                bg-[#0b1220] border-2 border-white/20
                shadow-lg shadow-black/30
                transition-all duration-300
                ${isMainButtonActive ? 'border-cyan-400/50 shadow-cyan-500/20' : ''}
              `}
            >
              {mainButtonContent}
            </motion.button>
            {/* Glow effect when active */}
            {isMainButtonActive && (
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl -z-10 animate-pulse" />
            )}
          </div>

          {/* Right nav items */}
          {NAV_ITEMS.slice(2).map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              disabled={item.id !== 'home'} // Only home is functional for now
            />
          ))}
        </div>
      </div>
    </motion.nav>
  );
}

interface NavButtonProps {
  icon: typeof Home;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function NavButton({ icon: Icon, label, isActive, onClick, disabled }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all
        ${isActive 
          ? 'text-cyan-400' 
          : disabled 
            ? 'text-white/20 cursor-not-allowed' 
            : 'text-white/50 hover:text-white/70 active:scale-95'
        }
      `}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
