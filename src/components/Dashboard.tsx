import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OvernightCard, DailySummary, UrgencyLevel } from '../utils/constants';
import { DynamicIcon } from './DynamicIcon';
import { OvernightCardModal } from './OvernightCardModal';
import { calculateProximityGlow, createGlowGradient, cn, glass, rounded } from '../utils/glass';

interface DashboardProps {
  cards: OvernightCard[];
  dailySummary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isMock: boolean;
  onRefresh: () => void;
  naviPosition?: { x: number; y: number };
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

const urgencyColors: Record<UrgencyLevel, { accent: string; glow: string }> = {
  urgent: { accent: 'rgb(248, 113, 113)', glow: 'rgba(248, 113, 113, 0.4)' },
  high: { accent: 'rgb(251, 191, 36)', glow: 'rgba(251, 191, 36, 0.4)' },
  medium: { accent: 'rgb(52, 211, 153)', glow: 'rgba(52, 211, 153, 0.4)' },
  low: { accent: 'rgb(34, 211, 238)', glow: 'rgba(34, 211, 238, 0.4)' },
};

// ============================================
// Reusable Glass Container with Proximity Glow
// ============================================
interface GlassContainerProps {
  children: React.ReactNode;
  naviPosition?: { x: number; y: number };
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
  glowColor?: string;
  maxGlowDistance?: number;
}

export function GlassContainer({
  children,
  naviPosition,
  className,
  onClick,
  as = 'div',
  glowColor = 'rgba(34, 211, 238, 0.5)',
  maxGlowDistance = 300,
}: GlassContainerProps) {
  const ref = useRef<HTMLDivElement | HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ intensity: 0, position: { x: 50, y: 50 } });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const result = calculateProximityGlow(rect, naviPosition, maxGlowDistance);
    setGlow(result);
  }, [naviPosition, maxGlowDistance]);

  const baseClasses = cn(
    'relative overflow-hidden',
    rounded.lg,
    glass.card,
    as === 'button' && glass.cardHover,
    as === 'button' && 'transition-all duration-300 active:scale-[0.98]',
    className
  );

  const content = (
    <>
      {/* Navi proximity glow effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-2xl"
        style={{
          opacity: glow.intensity,
          background: createGlowGradient(glow.position, glowColor),
        }}
      />

      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative">{children}</div>
    </>
  );

  if (as === 'button') {
    return (
      <motion.button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={onClick}
        data-interactive
        whileTap={{ scale: 0.98 }}
        className={baseClasses}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={baseClasses}>
      {content}
    </div>
  );
}

// ============================================
// Animated Word Component for Greeting
// ============================================
function AnimatedWord({ word, index, delay }: { word: string; index: number; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: delay + index * 0.08,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="inline-block mr-[0.25em]"
    >
      {word}
    </motion.span>
  );
}

// ============================================
// Overnight Card Component
// ============================================
function OvernightCardItem({
  card,
  index,
  onClick,
  naviPosition,
  entranceDelay,
}: {
  card: OvernightCard;
  index: number;
  onClick: () => void;
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
}) {
  const colors = urgencyColors[card.urgency];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        delay: entranceDelay + index * 0.1,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <GlassContainer
        as="button"
        onClick={onClick}
        naviPosition={naviPosition}
        glowColor="rgba(34, 211, 238, 0.5)"
        className="w-full text-left"
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon container - subtle glassmorphism, no harsh glow */}
            <div
              className={cn(
                'shrink-0 p-3',
                rounded.lg,
                'backdrop-blur-sm bg-white/[0.04]',
                'border border-white/[0.08]'
              )}
            >
              <DynamicIcon name={card.icon} className="w-5 h-5" style={{ color: colors.accent }} />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-white truncate">{card.title}</h3>
                {/* Urgency indicator */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: colors.accent, boxShadow: `0 0 8px ${colors.glow}` }}
                />
              </div>
              <p className="text-sm text-white/50 truncate">{card.description}</p>
            </div>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Speech Bubble with Word Animation
// ============================================
function SpeechBubble({
  summary,
  lastUpdated,
  naviPosition,
  entranceDelay,
}: {
  summary: string;
  lastUpdated: string | null;
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
}) {
  const words = summary.split(' ');
  const [showWords, setShowWords] = useState(false);

  // Start word animation after bubble appears
  useEffect(() => {
    const timer = setTimeout(() => setShowWords(true), (entranceDelay + 0.3) * 1000);
    return () => clearTimeout(timer);
  }, [entranceDelay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: entranceDelay,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="mb-6"
    >
      <GlassContainer naviPosition={naviPosition} glowColor="rgba(34, 211, 238, 0.4)">
        {/* Subtle cyan glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-400/10 blur-3xl pointer-events-none" />

        {/* Top cyan highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-cyan-400/70 uppercase tracking-wider">
              While you slept...
            </span>
            {lastUpdated && <span className="text-xs text-white/30">{formatLastUpdated(lastUpdated)}</span>}
          </div>
          <p className="text-base text-white/80 leading-relaxed min-h-[3em]">
            {showWords
              ? words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.03,
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                  className="inline-block mr-[0.25em]"
                >
                  {word}
                </motion.span>
              ))
              : null}
          </p>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================
export function Dashboard({
  cards,
  dailySummary,
  isLoading,
  error,
  lastUpdated,
  isMock,
  onRefresh: _onRefresh,
  naviPosition,
}: DashboardProps) {
  const [selectedCard, setSelectedCard] = useState<OvernightCard | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const greeting = useMemo(() => getGreeting(), []);
  const greetingWords = greeting.split(' ');

  // Reset animations when dashboard is shown
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, []);

  // Base delays for staggered animations
  const greetingDelay = 0.1;
  const speechBubbleDelay = greetingDelay + greetingWords.length * 0.08 + 0.3;
  const cardsDelay = speechBubbleDelay + 0.8;

  return (
    <div
      key={animationKey}
      className="flex-1 flex flex-col overflow-hidden px-5 lg:px-8"
    >
      {/* Desktop: Bento Grid Layout / Mobile: Stack Layout */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-6 lg:py-8 overflow-hidden">

        {/* ===== GREETING SECTION ===== */}
        {/* Mobile: Top / Desktop: Top-left spanning 8 cols */}
        <header
          className="pb-2 shrink-0 lg:col-span-8 lg:pt-0 lg:pb-0 lg:flex lg:flex-col lg:justify-center touch-none"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 20px) + 36px)',
          }}
        >
          {/* Greeting with word animation */}
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
            {greetingWords.map((word, i) => (
              <AnimatedWord key={`${animationKey}-greeting-${i}`} word={word} index={i} delay={greetingDelay} />
            ))}
            <AnimatedWord key={`${animationKey}-comma`} word="," index={greetingWords.length} delay={greetingDelay} />
          </h1>
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: greetingDelay + (greetingWords.length + 1) * 0.08,
              duration: 0.5,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="text-3xl lg:text-5xl font-bold text-cyan-400 tracking-tight"
          >
            Glenn
          </motion.h1>
          {isMock && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'inline-flex items-center px-2 py-0.5 text-[10px] font-medium w-fit',
                'text-amber-300/80 bg-amber-500/10 border border-amber-500/20',
                rounded.full,
                'mt-2'
              )}
            >
              Demo Mode
            </motion.span>
          )}
        </header>

        {/* ===== NAVI AREA (Desktop only) ===== */}
        {/* Desktop: Top-right area for Navi to float in */}
        <div className="hidden lg:block lg:col-span-4 lg:row-span-1" />

        {/* Error banner - spans full width on desktop */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'mb-4 px-4 py-3 text-red-300 text-sm lg:col-span-12',
                rounded.lg,
                'bg-red-500/10 border border-red-500/20',
                glass.blur.xl
              )}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== MAIN CONTENT AREA ===== */}
        {/* Desktop: Bento grid with speech bubble and cards side by side */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:col-span-12 lg:grid lg:grid-cols-12 lg:gap-6 lg:overflow-visible">

          {/* ===== SPEECH BUBBLE ===== */}
          {/* Mobile: Full width / Desktop: Left side, takes 5 cols */}
          <div className="shrink-0 lg:col-span-5 lg:flex lg:flex-col">
            {dailySummary && (
              <SpeechBubble
                summary={dailySummary.summary}
                lastUpdated={lastUpdated}
                naviPosition={naviPosition}
                entranceDelay={speechBubbleDelay}
              />
            )}

            {/* Desktop: Quick Stats Card (placeholder for future) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: speechBubbleDelay + 0.3 }}
              className="hidden lg:block"
            >
              <GlassContainer className="p-5">
                <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-white">{cards.length}</p>
                    <p className="text-xs text-white/50">Updates</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">
                      {cards.filter(c => c.urgency === 'urgent' || c.urgency === 'high').length}
                    </p>
                    <p className="text-xs text-white/50">Urgent</p>
                  </div>
                </div>
              </GlassContainer>
            </motion.div>
          </div>

          {/* ===== CARDS SECTION ===== */}
          {/* Mobile: Scrollable stack / Desktop: Right side grid, takes 7 cols */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:col-span-7">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: cardsDelay - 0.2 }}
              className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1 mb-4 shrink-0"
            >
              Your Updates
            </motion.h2>

            {/* Scrollable cards container */}
            {/* Mobile: Vertical scroll / Desktop: 2-column grid with scroll */}
            <div className="overflow-y-auto flex-1 pb-32 lg:pb-8 hide-scrollbar overscroll-contain">
              <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                <AnimatePresence mode="popLayout">
                  {cards.map((card, index) => (
                    <OvernightCardItem
                      key={card.id}
                      card={card}
                      index={index}
                      onClick={() => setSelectedCard(card)}
                      naviPosition={naviPosition}
                      entranceDelay={cardsDelay}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {cards.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: cardsDelay }}
                  className="text-center py-12 text-white/30 text-base lg:col-span-2"
                >
                  No updates yet. Check back later!
                </motion.div>
              )}

              {isLoading && cards.length === 0 && (
                <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: cardsDelay + i * 0.1 }}
                      className={cn('h-20', rounded.lg, glass.card, 'animate-pulse')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Modal */}
      <AnimatePresence>
        {selectedCard && (
          <OvernightCardModal
            card={selectedCard}
            isOpen={true}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
