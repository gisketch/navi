import { motion } from 'framer-motion';
import { Home, Bell, User, MessageCircle, Settings, Wallet } from 'lucide-react';
import { cn } from '../utils/glass';

type NavTab = 'home' | 'search' | 'finance' | 'notifications' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onChatClick: () => void;
  onSettingsClick: () => void;
}

const NAV_ITEMS: { id: NavTab; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'finance', icon: Wallet, label: 'Finance' },
  { id: 'notifications', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onChatClick,
  onSettingsClick,
}: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={cn(
        'hidden lg:flex flex-col w-20 h-full relative z-10',
        'backdrop-blur-xl bg-white/[0.02]',
        'border-r border-white/[0.06]',
        'py-6 px-3'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-center mb-8">
        <div className={cn(
          'w-10 h-10 rounded-xl',
          'bg-gradient-to-br from-cyan-400/20 to-cyan-600/20',
          'border border-cyan-400/30',
          'flex items-center justify-center'
        )}>
          <span className="text-cyan-400 font-bold text-lg">N</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = item.id !== 'home' && item.id !== 'finance'; // Home and Finance are enabled

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: isDisabled ? 1 : 1.05 }}
              whileTap={{ scale: isDisabled ? 1 : 0.95 }}
              onClick={() => !isDisabled && onTabChange(item.id)}
              disabled={isDisabled}
              className={cn(
                'relative w-12 h-12 rounded-xl flex items-center justify-center',
                'transition-all duration-300',
                isActive
                  ? 'bg-white/[0.10] border border-cyan-400/30'
                  : 'hover:bg-white/[0.05]',
                isDisabled && 'opacity-30 cursor-not-allowed'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="sidebarIndicator"
                  className="absolute left-0 w-1 h-6 bg-cyan-400 rounded-r-full"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                className={cn(
                  'transition-colors duration-300',
                  isActive ? 'text-cyan-400' : 'text-white/50'
                )}
              />
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        {/* Chat Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onChatClick}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            'backdrop-blur-xl bg-cyan-400/10',
            'border border-cyan-400/30',
            'transition-all duration-300',
            'hover:bg-cyan-400/20 hover:border-cyan-400/50',
            'shadow-[0_0_20px_rgba(34,211,238,0.15)]'
          )}
        >
          <MessageCircle size={22} className="text-cyan-400" />
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            'transition-all duration-300',
            'hover:bg-white/[0.05]'
          )}
        >
          <Settings size={22} className="text-white/50" />
        </motion.button>
      </div>
    </motion.aside>
  );
}
