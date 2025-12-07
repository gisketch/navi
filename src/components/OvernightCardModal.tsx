import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { OvernightCard, UrgencyLevel } from '../utils/constants';
import { DynamicIcon } from './DynamicIcon';

interface OvernightCardModalProps {
  card: OvernightCard | null;
  isOpen: boolean;
  onClose: () => void;
}

const urgencyStyles: Record<UrgencyLevel, { bg: string; border: string; badge: string }> = {
  urgent: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  high: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  normal: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  low: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
};

export function OvernightCardModal({ card, isOpen, onClose }: OvernightCardModalProps) {
  if (!card) return null;

  const styles = urgencyStyles[card.urgency];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal - Full screen on mobile */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#0a0f18] md:inset-4 md:rounded-2xl md:m-auto md:max-w-2xl md:max-h-[90vh]"
          >
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-4 border-b ${styles.border} shrink-0`}>
              {/* Icon */}
              <div className={`p-2 rounded-xl ${styles.bg} ${styles.border} border`}>
                <DynamicIcon name={card.icon} className="w-5 h-5 text-white/80" />
              </div>

              {/* Title & Urgency */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{card.title}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${styles.badge}`}>
                  {card.urgency}
                </span>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-invert prose-sm max-w-none">
                {/* Render markdown content as simple formatted text */}
                {card.content.split('\n').map((line, i) => {
                  // Headers
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-lg font-semibold text-white mt-4 mb-2">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-base font-medium text-white/90 mt-3 mb-1">{line.slice(4)}</h3>;
                  }
                  // Blockquotes
                  if (line.startsWith('> ')) {
                    return (
                      <blockquote key={i} className="border-l-2 border-white/20 pl-3 text-white/70 italic my-2">
                        {line.slice(2)}
                      </blockquote>
                    );
                  }
                  // Checkboxes
                  if (line.startsWith('- [ ] ')) {
                    return (
                      <div key={i} className="flex items-center gap-2 text-white/80 my-1">
                        <div className="w-4 h-4 rounded border border-white/30" />
                        <span>{line.slice(6)}</span>
                      </div>
                    );
                  }
                  if (line.startsWith('- [x] ')) {
                    return (
                      <div key={i} className="flex items-center gap-2 text-white/60 my-1 line-through">
                        <div className="w-4 h-4 rounded border border-emerald-500/50 bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                        <span>{line.slice(6)}</span>
                      </div>
                    );
                  }
                  // List items
                  if (line.startsWith('- ')) {
                    return <li key={i} className="text-white/80 ml-4 my-1">{line.slice(2)}</li>;
                  }
                  // Bold text
                  if (line.includes('**')) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i} className="text-white/80 my-1">
                        {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part)}
                      </p>
                    );
                  }
                  // Empty line
                  if (line.trim() === '') {
                    return <div key={i} className="h-2" />;
                  }
                  // Regular text
                  return <p key={i} className="text-white/80 my-1">{line}</p>;
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
