import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Box, X } from 'lucide-react';
import type { CardData } from '../utils/constants';
import { cn, rounded, calculateProximityGlow, createGlowGradient } from '../utils/glass';
import type { NaviState } from './Navi';

// Navi state colors for glow
const naviStateColors = {
  offline: { glow: 'rgba(255,255,255,0.3)', primary: 'rgb(255,255,255)' },
  idle: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
  listening: { glow: 'rgba(255, 221, 0, 0.4)', primary: 'rgb(255, 221, 0)' },
  thinking: { glow: 'rgba(0, 255, 136, 0.4)', primary: 'rgb(0, 255, 136)' },
  speaking: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
};

// Card type colors (matching Dashboard style)
const cardTypeColors = {
  notes: { accent: 'rgb(168, 85, 247)', glow: 'rgba(168, 85, 247, 0.4)' }, // Purple
  calendar: { accent: 'rgb(59, 130, 246)', glow: 'rgba(59, 130, 246, 0.4)' }, // Blue
  other: { accent: 'rgb(34, 211, 238)', glow: 'rgba(34, 211, 238, 0.4)' }, // Cyan
};

interface ResultCardsProps {
    cards: CardData[];
    className?: string;
    onClose?: () => void;
    naviPosition?: { x: number; y: number };
    naviState?: NaviState;
}

// Individual card with glassmorphism and proximity glow
function ResultCard({
  card,
  index,
  naviPosition,
  naviState = 'idle',
}: {
  card: CardData;
  index: number;
  naviPosition?: { x: number; y: number };
  naviState?: NaviState;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
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

  const handleCardClick = () => {
    if (card.card_type === 'notes') {
      const uri = `obsidian://open?file=${encodeURIComponent(card.card_title)}`;
      window.open(uri, '_self');
    }
  };

  return (
    <motion.button
      ref={cardRef}
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{
        delay: index * 0.08,
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }}
      onClick={handleCardClick}
      className={cn(
        'relative flex-shrink-0 w-56 p-4 text-left select-none',
        rounded.lg,
        'bg-white/[0.04] backdrop-blur-xl',
        'border border-white/[0.08]',
        'hover:bg-white/[0.08] hover:border-white/[0.12]',
        'active:scale-[0.98] transition-all duration-200'
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
        {/* Icon with type-based glow */}
        <div
          className={cn(
            'p-2 rounded-lg',
            'bg-white/[0.06] border border-white/[0.08]'
          )}
          style={{
            boxShadow: `0 0 12px ${typeColor.glow.replace('0.4', '0.2')}`,
          }}
        >
          {getIcon(card.card_type)}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white/90 truncate mb-1">
            {card.card_title}
          </h4>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
            {card.card_description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

export function ResultCards({ cards, className = '', onClose, naviPosition, naviState }: ResultCardsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [constraints, setConstraints] = useState({ left: 0, right: 0 });

    if (!cards || cards.length === 0) return null;

    useEffect(() => {
        const updateConstraints = () => {
            if (containerRef.current && sliderRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const sliderWidth = sliderRef.current.scrollWidth;
                const maxDrag = Math.min(0, containerWidth - sliderWidth - 32);
                setConstraints({ left: maxDrag, right: 0 });
            }
        };

        updateConstraints();
        window.addEventListener('resize', updateConstraints);
        return () => window.removeEventListener('resize', updateConstraints);
    }, [cards]);

    return (
        <div className={`relative w-full ${className}`}>
            {/* Close Button */}
            {onClose && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        'absolute -top-8 right-2 p-2 z-10',
                        rounded.full,
                        'bg-white/[0.06] backdrop-blur-xl',
                        'border border-white/[0.08]',
                        'text-white/40 hover:text-white/80 hover:bg-white/[0.12]',
                        'transition-all duration-200'
                    )}
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                >
                    <X size={14} />
                </motion.button>
            )}

            {/* Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full overflow-hidden py-2 px-2"
                ref={containerRef}
            >
                {/* Draggable Slider */}
                <motion.div
                    ref={sliderRef}
                    drag="x"
                    dragConstraints={constraints}
                    dragElastic={0.1}
                    dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
                    className="flex gap-3 px-2 min-w-min cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
                    whileTap={{ cursor: "grabbing" }}
                >
                    {cards.map((card, index) => (
                        <ResultCard
                          key={`${card.card_title}-${index}`}
                          card={card}
                          index={index}
                          naviPosition={naviPosition}
                          naviState={naviState}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
