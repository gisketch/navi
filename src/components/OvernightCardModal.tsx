import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { OvernightCard, UrgencyLevel } from '../utils/constants';
import { DynamicIcon } from './DynamicIcon';
import { cn, glass, rounded } from '../utils/glass';

interface OvernightCardModalProps {
  card: OvernightCard | null;
  isOpen: boolean;
  onClose: () => void;
}

const urgencyStyles: Record<UrgencyLevel, { accent: string; glow: string; badge: string }> = {
  urgent: {
    accent: 'rgb(248, 113, 113)',
    glow: 'rgba(248, 113, 113, 0.3)',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  high: {
    accent: 'rgb(251, 191, 36)',
    glow: 'rgba(251, 191, 36, 0.3)',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  medium: {
    accent: 'rgb(52, 211, 153)',
    glow: 'rgba(52, 211, 153, 0.3)',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  low: {
    accent: 'rgb(34, 211, 238)',
    glow: 'rgba(34, 211, 238, 0.3)',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
};

export function OvernightCardModal({ card, isOpen, onClose }: OvernightCardModalProps) {
  const styles = card ? urgencyStyles[card.urgency] : urgencyStyles.low;

  return (
    <AnimatePresence mode="wait">
      {isOpen && card && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Modal - Glassmorphism style with safe area */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 400,
              mass: 0.8,
            }}
            className={cn(
              'fixed z-50 flex flex-col',
              // Mobile: respect safe area (notch/dynamic island)
              'left-4 right-4 bottom-4',
              'top-[max(1rem,env(safe-area-inset-top))]',
              // Desktop: centered modal
              'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
              'md:w-full md:max-w-2xl md:max-h-[85vh]',
              rounded.xl,
              glass.blur['2xl'],
              'bg-white/[0.05] border border-white/[0.10]',
              'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            )}
          >
            {/* Top glow effect based on urgency */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-3xl pointer-events-none rounded-full"
              style={{ background: styles.glow }}
            />

            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-3xl" />

            {/* Header */}
            <div className={cn('flex items-center gap-4 px-6 py-5 border-b border-white/[0.08] shrink-0')}>
              {/* Icon */}
              <div
                className={cn('p-3', rounded.lg, glass.bg.light, 'border border-white/[0.1]')}
                style={{ boxShadow: `0 0 20px ${styles.glow}` }}
              >
                <DynamicIcon name={card.icon} className="w-6 h-6" style={{ color: styles.accent }} />
              </div>

              {/* Title & Urgency */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-white truncate mb-1">{card.title}</h2>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border',
                    styles.badge
                  )}
                >
                  {card.urgency}
                </span>
              </div>

              {/* Close button - Glassmorphism */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={cn(
                  'p-2.5',
                  rounded.full,
                  glass.bg.light,
                  'border border-white/[0.1]',
                  'text-white/60 hover:text-white hover:bg-white/[0.15]',
                  'transition-all duration-200 shrink-0'
                )}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Content - Scrollable with more padding */}
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <div className="prose prose-invert prose-sm max-w-none space-y-3">
                {/* Render markdown content as simple formatted text */}
                {card.content.split('\n').map((line, i) => {
                  // Headers
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={i} className="text-lg font-semibold text-white mt-6 mb-3">
                        {line.slice(3)}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-2">
                        {line.slice(4)}
                      </h3>
                    );
                  }
                  // Blockquotes - Glassmorphism style
                  if (line.startsWith('> ')) {
                    return (
                      <blockquote
                        key={i}
                        className={cn(
                          'border-l-2 border-cyan-400/50 pl-4 py-2 my-3',
                          glass.bg.subtle,
                          rounded.md,
                          'text-white/70 italic'
                        )}
                      >
                        {line.slice(2)}
                      </blockquote>
                    );
                  }
                  // Checkboxes - Glassmorphism
                  if (line.startsWith('- [ ] ')) {
                    return (
                      <div key={i} className="flex items-center gap-3 text-white/80 my-2">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-md',
                            glass.bg.light,
                            'border border-white/20'
                          )}
                        />
                        <span>{line.slice(6)}</span>
                      </div>
                    );
                  }
                  if (line.startsWith('- [x] ')) {
                    return (
                      <div key={i} className="flex items-center gap-3 text-white/50 my-2">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center',
                            'bg-emerald-500/20 border border-emerald-500/40',
                            'text-emerald-400 text-xs'
                          )}
                        >
                          ✓
                        </div>
                        <span className="line-through">{line.slice(6)}</span>
                      </div>
                    );
                  }
                  // List items
                  if (line.startsWith('- ')) {
                    return (
                      <li key={i} className="text-white/80 ml-4 my-1.5 list-disc">
                        {line.slice(2)}
                      </li>
                    );
                  }
                  // Bold text
                  if (line.includes('**')) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i} className="text-white/80 my-2 leading-relaxed">
                        {parts.map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="text-white font-semibold">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  }
                  // Empty line
                  if (line.trim() === '') {
                    return <div key={i} className="h-3" />;
                  }
                  // Regular text
                  return (
                    <p key={i} className="text-white/80 my-2 leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Footer with timestamp */}
            <div className={cn('px-6 py-4 border-t border-white/[0.08] shrink-0')}>
              <p className="text-xs text-white/30">
                Created: {new Date(card.created).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
