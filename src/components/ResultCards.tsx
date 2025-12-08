import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { FileText, Calendar, Box, X } from 'lucide-react';
import type { CardData } from '../utils/constants';
import { cn, rounded, calculateProximityGlow, createGlowGradient } from '../utils/glass';
import type { NaviState } from './Navi';
import { ResultCardModal } from './ResultCardModal';

// Navi state colors for glow
const naviStateColors = {
  offline: { glow: 'rgba(255,255,255,0.3)', primary: 'rgb(255,255,255)' },
  idle: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
  listening: { glow: 'rgba(255, 221, 0, 0.4)', primary: 'rgb(255, 221, 0)' },
  thinking: { glow: 'rgba(0, 255, 136, 0.4)', primary: 'rgb(0, 255, 136)' },
  speaking: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
};

// Card type colors
const cardTypeColors = {
  notes: { accent: 'rgb(168, 85, 247)', glow: 'rgba(168, 85, 247, 0.4)' },
  calendar: { accent: 'rgb(59, 130, 246)', glow: 'rgba(59, 130, 246, 0.4)' },
  other: { accent: 'rgb(34, 211, 238)', glow: 'rgba(34, 211, 238, 0.4)' },
};

// Dismiss threshold
const DISMISS_THRESHOLD = 80;

interface ResultCardsProps {
  cards: CardData[];
  className?: string;
  onDismiss?: () => void;
  naviPosition?: { x: number; y: number };
  naviState?: NaviState;
}

// Individual card component
function ResultCard({
  card,
  naviPosition,
  naviState = 'idle',
  onTap,
}: {
  card: CardData;
  naviPosition?: { x: number; y: number };
  naviState?: NaviState;
  onTap: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const stateColor = naviStateColors[naviState];
  const typeColor = cardTypeColors[card.card_type] || cardTypeColors.other;

  useLayoutEffect(() => {
    if (cardRef.current && naviPosition) {
      const rect = cardRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, 400);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition?.x, naviPosition?.y]);

  const getIcon = (type: CardData['card_type']) => {
    const iconColor = typeColor.accent;
    switch (type) {
      case 'notes': return <FileText size={16} style={{ color: iconColor }} />;
      case 'calendar': return <Calendar size={16} style={{ color: iconColor }} />;
      default: return <Box size={16} style={{ color: iconColor }} />;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex-shrink-0 w-52 p-3 select-none cursor-pointer',
        rounded.lg,
        'bg-white/[0.04] backdrop-blur-xl',
        'border border-white/[0.08]',
        'transition-colors duration-200',
        'hover:bg-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        boxShadow: glowIntensity > 0.03
          ? `inset 0 0 ${20 * glowIntensity}px ${stateColor.glow.replace('0.4', `${glowIntensity * 0.15}`)}, 0 0 ${25 * glowIntensity}px ${stateColor.glow.replace('0.4', `${glowIntensity * 0.2}`)}`
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Proximity glow overlay */}
      {glowIntensity > 0.03 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition, stateColor.glow.replace('0.4', `${glowIntensity * 0.3}`)),
          }}
        />
      )}

      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-xl" />

      <div className="flex items-start gap-3 relative z-10">
        {/* Icon */}
        <div
          className={cn(
            'p-2 rounded-lg flex-shrink-0',
            'bg-white/[0.06] border border-white/[0.08]'
          )}
          style={{
            boxShadow: `0 0 12px ${typeColor.glow.replace('0.4', '0.2')}`,
          }}
        >
          {getIcon(card.card_type)}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white/90 truncate mb-0.5">
            {card.card_title}
          </h4>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
            {card.card_description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ResultCards({ cards, className = '', onDismiss, naviPosition, naviState }: ResultCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  
  // Raw drag position
  const rawX = useMotionValue(0);
  // Smoothed position with spring
  const x = useSpring(rawX, { damping: 30, stiffness: 300 });
  
  // Dismiss progress (only when dragging right past 0)
  const dismissProgress = useTransform(rawX, [0, DISMISS_THRESHOLD], [0, 1]);
  const dismissOpacity = useTransform(dismissProgress, [0, 0.3, 1], [0, 0.5, 1]);
  const dismissScale = useTransform(dismissProgress, [0, 0.5, 1], [0.6, 0.9, 1.15]);

  // Calculate max drag distance (how far left we can go)
  useEffect(() => {
    const updateMaxDrag = () => {
      if (containerRef.current && wrapperRef.current) {
        const contentWidth = containerRef.current.scrollWidth;
        const viewportWidth = wrapperRef.current.clientWidth;
        const max = Math.max(0, contentWidth - viewportWidth + 32); // +32 for padding
        setMaxDrag(max);
      }
    };

    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, [cards]);

  // Handle drag
  const handleDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentX = rawX.get();
    let newX = currentX + info.delta.x;
    
    // Allow dragging right (positive) up to DISMISS_THRESHOLD + some elastic
    // Allow dragging left (negative) up to -maxDrag with elastic beyond
    if (newX > DISMISS_THRESHOLD + 30) {
      // Elastic resistance past dismiss threshold
      newX = DISMISS_THRESHOLD + 30 + (newX - DISMISS_THRESHOLD - 30) * 0.2;
    } else if (newX < -maxDrag) {
      // Elastic resistance past max scroll
      const overscroll = -maxDrag - newX;
      newX = -maxDrag - overscroll * 0.3;
    }
    
    rawX.set(newX);
  }, [rawX, maxDrag]);

  // Handle drag end
  const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentX = rawX.get();
    
    // Check for dismiss (dragged right past threshold)
    if (currentX >= DISMISS_THRESHOLD && onDismiss) {
      // Animate out to the RIGHT (continue the swipe direction) then dismiss
      rawX.set(400);
      setTimeout(() => onDismiss(), 200);
      return;
    }
    
    // Apply momentum
    const velocity = info.velocity.x;
    let targetX = currentX + velocity * 0.2;
    
    // Clamp to valid range
    targetX = Math.max(-maxDrag, Math.min(0, targetX));
    
    rawX.set(targetX);
  }, [rawX, maxDrag, onDismiss]);

  const handleTapCard = useCallback((card: CardData) => {
    setSelectedCard(card);
  }, []);

  if (!cards || cards.length === 0) return null;

  return (
    <>
      <div ref={wrapperRef} className={`relative w-full ${className}`} data-result-cards>
        {/* Dismiss X icon - on LEFT side */}
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20"
          style={{ opacity: dismissOpacity }}
        >
          <motion.div
            className={cn(
              'p-3 rounded-full',
              'bg-red-500/20 border border-red-500/40',
            )}
            style={{ 
              scale: dismissScale,
            }}
          >
            <X size={20} className="text-red-400" />
          </motion.div>
        </motion.div>

        {/* Scrollable container */}
        <div className="overflow-hidden py-2">
          <motion.div
            ref={containerRef}
            drag="x"
            dragMomentum={false}
            dragElastic={0}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className={cn(
              'flex gap-3 px-4 min-w-max',
              'cursor-grab active:cursor-grabbing',
              'touch-none select-none'
            )}
          >
            {cards.map((card, index) => (
              <ResultCard
                key={`${card.card_title}-${index}`}
                card={card}
                naviPosition={naviPosition}
                naviState={naviState}
                onTap={() => handleTapCard(card)}
              />
            ))}
          </motion.div>
        </div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Card Detail Modal */}
      <ResultCardModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </>
  );
}
