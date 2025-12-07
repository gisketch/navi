import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { OvernightCard, DailySummary, UrgencyLevel } from '../utils/constants';
import { DynamicIcon } from './DynamicIcon';
import { OvernightCardModal } from './OvernightCardModal';

interface DashboardProps {
  cards: OvernightCard[];
  dailySummary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isMock: boolean;
  onRefresh: () => void;
}

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Format relative time
function formatLastUpdated(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

const urgencyStyles: Record<UrgencyLevel, { bg: string; border: string; dot: string; text: string }> = {
  urgent: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    text: 'text-red-300',
  },
  high: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
  normal: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
  },
  low: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    text: 'text-cyan-300',
  },
};

export function Dashboard({
  cards,
  dailySummary,
  isLoading,
  error,
  lastUpdated,
  isMock,
  onRefresh,
}: DashboardProps) {
  const [selectedCard, setSelectedCard] = useState<OvernightCard | null>(null);
  
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-28">
      {/* Header */}
      <header className="pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, <span className="text-cyan-400">Ghegi</span>
            </h1>
            {isMock && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-amber-300 bg-amber-500/20 rounded-full mt-1">
                Mock Data
              </span>
            )}
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Navi Speech Bubble - AI Summary */}
      {dailySummary && (
        <div className="flex gap-3 mb-6">
          {/* Navi avatar placeholder - actual Navi is positioned elsewhere */}
          <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/30 to-cyan-600/30 border border-cyan-400/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          
          {/* Speech bubble */}
          <div className="flex-1 relative">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">While you slept...</span>
                {lastUpdated && (
                  <span className="text-[10px] text-white/30">{formatLastUpdated(lastUpdated)}</span>
                )}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {dailySummary.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">
          Your Updates
        </h2>
        
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const styles = urgencyStyles[card.urgency];
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCard(card)}
                className={`
                  w-full text-left p-3 rounded-xl border backdrop-blur-sm
                  ${styles.bg} ${styles.border}
                  hover:bg-white/5 active:scale-[0.98] transition-all
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${styles.bg} border ${styles.border}`}>
                    <DynamicIcon name={card.icon} className={`w-5 h-5 ${styles.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-medium text-white truncate">{card.title}</h3>
                      {/* Urgency dot */}
                      <div className={`w-2 h-2 rounded-full ${styles.dot} shrink-0`} />
                    </div>
                    <p className="text-xs text-white/50 truncate">{card.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {cards.length === 0 && !isLoading && (
          <div className="text-center py-8 text-white/40 text-sm">
            No updates yet. Check back later!
          </div>
        )}

        {isLoading && cards.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* Card Modal */}
      <OvernightCardModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
