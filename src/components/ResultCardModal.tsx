import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, Box, ExternalLink } from 'lucide-react';
import type { CardData } from '../utils/constants';
import { cn, glass, rounded } from '../utils/glass';

interface ResultCardModalProps {
  card: CardData | null;
  isOpen: boolean;
  onClose: () => void;
}

// Card type colors (matching Dashboard style)
const cardTypeColors = {
  notes: { accent: 'rgb(168, 85, 247)', glow: 'rgba(168, 85, 247, 0.3)', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  calendar: { accent: 'rgb(59, 130, 246)', glow: 'rgba(59, 130, 246, 0.3)', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  other: { accent: 'rgb(34, 211, 238)', glow: 'rgba(34, 211, 238, 0.3)', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
};

export function ResultCardModal({ card, isOpen, onClose }: ResultCardModalProps) {
  if (!card) return null;

  const styles = cardTypeColors[card.card_type] || cardTypeColors.other;

  const getIcon = (type: CardData['card_type']) => {
    const iconProps = { className: 'w-6 h-6', style: { color: styles.accent } };
    switch (type) {
      case 'notes': return <FileText {...iconProps} />;
      case 'calendar': return <Calendar {...iconProps} />;
      default: return <Box {...iconProps} />;
    }
  };

  const handleOpenInObsidian = () => {
    if (card.card_type === 'notes') {
      const uri = `obsidian://open?file=${encodeURIComponent(card.card_title)}`;
      window.open(uri, '_self');
      onClose();
    }
  };

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
              // Mobile: respect safe area
              'left-4 right-4 bottom-4',
              'max-h-[60vh]',
              // Desktop: centered modal
              'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
              'md:w-full md:max-w-md md:max-h-[50vh]',
              rounded.xl,
              glass.blur['2xl'],
              'bg-white/[0.05] border border-white/[0.10]',
              'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            )}
          >
            {/* Top glow effect based on card type */}
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
                {getIcon(card.card_type)}
              </div>

              {/* Title & Type */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate mb-1">{card.card_title}</h2>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize',
                    styles.badge
                  )}
                >
                  {card.card_type}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <p className="text-white/80 leading-relaxed">
                {card.card_description}
              </p>
            </div>

            {/* Footer with action buttons */}
            <div className={cn('px-6 py-4 border-t border-white/[0.08] shrink-0 flex gap-3')}>
              {/* Cancel button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={cn(
                  'flex-1 py-3 px-4',
                  rounded.lg,
                  glass.bg.light,
                  'border border-white/[0.1]',
                  'text-white/70 hover:text-white hover:bg-white/[0.12]',
                  'transition-all duration-200',
                  'text-sm font-medium'
                )}
              >
                Cancel
              </motion.button>

              {/* Open in Obsidian button - only for notes */}
              {card.card_type === 'notes' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenInObsidian}
                  className={cn(
                    'flex-1 py-3 px-4 flex items-center justify-center gap-2',
                    rounded.lg,
                    'backdrop-blur-xl',
                    'bg-purple-500/20 border border-purple-400/30',
                    'text-purple-300 hover:text-purple-200',
                    'hover:bg-purple-500/30 hover:border-purple-400/40',
                    'transition-all duration-200',
                    'text-sm font-medium',
                    'shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  )}
                >
                  <ExternalLink size={16} />
                  Open in Obsidian
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
