import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Info } from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';
import { useEffect, useCallback, useState, createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const TOAST_CONFIGS = {
  success: {
    icon: Check,
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'rgba(16, 185, 129, 0.3)',
    iconBg: 'bg-emerald-500/20',
  },
  error: {
    icon: X,
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'bg-red-500/20',
  },
  info: {
    icon: Info,
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'rgba(6, 182, 212, 0.3)',
    iconBg: 'bg-cyan-500/20',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = TOAST_CONFIGS[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'relative overflow-hidden pointer-events-auto',
        rounded.lg,
        glass.card,
        config.bg,
        'border',
        config.border,
        'shadow-lg'
      )}
      style={{
        boxShadow: `0 0 20px ${config.glow}, 0 10px 40px -10px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top accent line */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: (toast.duration || 3000) / 1000, ease: 'linear' }}
        className={cn('absolute top-0 left-0 right-0 h-0.5', config.text.replace('text-', 'bg-'))}
        style={{ transformOrigin: 'left' }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          config.iconBg
        )}>
          <Icon size={16} className={config.text} />
        </div>

        {/* Message */}
        <p className="flex-1 text-sm text-white/90 font-medium">
          {toast.message}
        </p>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={14} className="text-white/40" />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-24 left-4 right-4 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
