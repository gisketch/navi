import { useMemo, memo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, CardData } from '../utils/constants';
import { ResultCards } from './ResultCards';
import { cn, rounded, calculateProximityGlow, createGlowGradient } from '../utils/glass';
import type { NaviState } from './Navi';

// ============================================
// Navi State Colors (synced with Navi.tsx)
// ============================================
const naviStateColors = {
  offline: { glow: 'rgba(255,255,255,0.3)', primary: 'rgb(255,255,255)' },
  idle: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
  listening: { glow: 'rgba(255, 221, 0, 0.4)', primary: 'rgb(255, 221, 0)' },
  thinking: { glow: 'rgba(0, 255, 136, 0.4)', primary: 'rgb(0, 255, 136)' },
  speaking: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
};

// ============================================
// Configurable constants
// ============================================
// GLOW_MAX_DISTANCE: Max distance for glow effect in chat mode (2x normal)
// Change this value to adjust when glow stops rendering
const GLOW_MAX_DISTANCE_CHAT = 700; // Double the normal 350px

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
  activeCards?: CardData[];
  onCloseCards?: () => void;
  naviPosition?: { x: number; y: number };
  naviState?: NaviState;
  liveStatus?: string | null;
}

// Get Navi's actual center position from DOM
const getNaviPosition = () => {
  const naviBody = document.getElementById('navi-body-center');
  if (naviBody) {
    const rect = naviBody.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.25 };
};

// ============================================
// Chat Bubble Component with Glassmorphism
// ============================================
interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  naviPosition: { x: number; y: number };
  naviState: NaviState;
  index: number;
}

// const mockCardData: CardData[] = [
//   {
//     card_type: 'notes',
//     card_title: 'Project Meeting Notes',
//     card_description: 'Discussion points from the Q4 planning session including budget allocation and timeline updates.'
//   },
//   {
//     card_type: 'calendar',
//     card_title: 'Team Sprint Review',
//     card_description: 'Weekly sprint review scheduled for Friday at 2:00 PM with the development team.'
//   },
//   {
//     card_type: 'notes',
//     card_title: 'Feature Requirements',
//     card_description: 'Detailed specifications for the new user authentication system and security protocols.'
//   },
//   {
//     card_type: 'other',
//     card_title: 'Resource Links',
//     card_description: 'Collection of helpful documentation, tutorials, and third-party tools for the project.'
//   }
// ];

const ChatBubble = memo(function ChatBubble({
  role,
  text,
  naviPosition,
  naviState,
  index,
}: ChatBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const stateColor = naviStateColors[naviState] || naviStateColors.idle;

  // Calculate proximity glow with extended distance for chat mode
  useLayoutEffect(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, GLOW_MAX_DISTANCE_CHAT);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition.x, naviPosition.y]);

  const isUser = role === 'user';


  // Dynamic glow color based on Navi state
  const glowColor = stateColor.glow;
  const primaryColor = stateColor.primary;

  return (
    <motion.div
      ref={bubbleRef}
      initial={{
        opacity: 0,
        y: isUser ? 30 : -20,
        x: isUser ? 20 : -20,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: -20,
        scale: 0.95,
      }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 350,
        delay: index * 0.03,
      }}
      className={cn(
        'relative max-w-[85%] px-4 py-3',
        rounded.lg,
        // User: right-aligned, darker glass with slight warmth
        isUser
          ? 'self-end bg-gray/30 border border-white/[0.08] backdrop-blur-xl'
          // Navi: left-aligned, bluer frosted glass
          : 'self-start bg-cyan-950/40 border border-cyan-400/[0.15] backdrop-blur-2xl'
      )}
      style={{
        // Dynamic proximity glow based on Navi state color
        // boxShadow: glowIntensity > 0.03
        //   ? `inset 0 0 ${25 * glowIntensity}px ${glowColor.replace('0.4', `${glowIntensity * 0.2}`)}, 0 0 ${35 * glowIntensity}px ${glowColor.replace('0.4', `${glowIntensity * 0.25}`)}`
        //   : !isUser
        //     ? `0 0 15px ${glowColor.replace('0.4', '0.08')}` // Subtle default glow for Navi
        //     : 'none',
      }}
    >
      {/* Proximity glow gradient overlay */}
      {glowIntensity > 0.03 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition, glowColor.replace('0.4', `${glowIntensity * 0.2}`)),
          }}
        />
      )}

      {/* Navi bubble top highlight - color matches state */}
      {!isUser && (
        <div
          className="absolute inset-x-0 top-0 h-px rounded-t-xl"
          style={{
            background: `linear-gradient(to right, transparent, ${primaryColor}40, transparent)`
          }}
        />
      )}

      {/* Role indicator */}
      <div className={cn(
        'text-[10px] font-medium uppercase tracking-wider mb-1',
        isUser ? 'text-white/30' : 'text-cyan-400/50'
      )}
        style={!isUser ? { color: `${primaryColor}80` } : undefined}
      >
        {isUser ? 'You' : 'Navi'}
      </div>

      {/* Message text */}
      <p className={cn(
        'text-sm leading-relaxed',
        isUser ? 'text-white/70' : 'text-white/90'
      )}>
        {text}
      </p>
    </motion.div>
  );
});

// ============================================
// Live Status Bubble (Navi's thinking status)
// ============================================
interface StatusBubbleProps {
  status: string;
  naviPosition: { x: number; y: number };
  naviState: NaviState;
}

const StatusBubble = memo(function StatusBubble({
  status,
  naviPosition,
  naviState,
}: StatusBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const stateColor = naviStateColors[naviState] || naviStateColors.thinking;
  const glowColor = stateColor.glow;
  const primaryColor = stateColor.primary;

  useLayoutEffect(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, GLOW_MAX_DISTANCE_CHAT);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition.x, naviPosition.y]);

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={cn(
        'self-start max-w-[85%] px-4 py-3',
        rounded.lg,
        'bg-emerald-950/30 border-gray/20 backdrop-blur-2xl'
      )}
      style={{
        borderColor: `${primaryColor}30`,
        // boxShadow: glowIntensity > 0.03
        //   ? `inset 0 0 ${25 * glowIntensity}px ${glowColor.replace('0.4', `${glowIntensity * 0.15}`)}, 0 0 ${30 * glowIntensity}px ${glowColor.replace('0.4', `${glowIntensity * 0.2}`)}`
        //   : `0 0 20px ${glowColor.replace('0.4', '0.1')}`,
      }}
    >
      {/* Glow overlay */}
      {glowIntensity > 0.03 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition, glowColor.replace('0.4', `${glowIntensity * 0.2}`)),
          }}
        />
      )}

      {/* Top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-xl"
        style={{
          background: `linear-gradient(to right, transparent, ${primaryColor}50, transparent)`
        }}
      />

      {/* Status content */}
      <div className="flex items-center gap-2">
        {/* Animated dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.1, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>

        {/* Status text */}
        <span
          className="text-sm"
          style={{ color: `${primaryColor}cc` }}
        >
          {status}
        </span>
      </div>
    </motion.div>
  );
});

// ============================================
// Listening Indicator
// ============================================
const ListeningIndicator = memo(function ListeningIndicator({ naviState }: { naviState: NaviState }) {
  const stateColor = naviStateColors[naviState] || naviStateColors.listening;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'self-end max-w-[85%] px-4 py-3',
        rounded.lg,
        'bg-black/20 border border-white/[0.06] backdrop-blur-xl'
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider mb-1 text-white/30">
        You
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: stateColor.primary }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// Main ChatUI Component
// ============================================
export function ChatUI({
  messages,
  currentTurn,
  isCapturing,
  activeCards,
  onCloseCards,
  naviPosition: externalNaviPosition,
  naviState = 'idle',
  liveStatus,
}: ChatUIProps) {
  // Track Navi's real position
  const [internalNaviPosition, setInternalNaviPosition] = useState(() => getNaviPosition());
  const lastPositionRef = useRef(internalNaviPosition);

  // Use external position if provided, otherwise track internally
  const naviPosition = externalNaviPosition || internalNaviPosition;

  // Has cards to show
  const hasCards = activeCards && activeCards.length > 0;

  // Update Navi position periodically
  useLayoutEffect(() => {
    if (externalNaviPosition) return;

    let animationId: number;
    const tick = () => {
      const newPos = getNaviPosition();
      if (
        Math.abs(newPos.x - lastPositionRef.current.x) > 1 ||
        Math.abs(newPos.y - lastPositionRef.current.y) > 1
      ) {
        lastPositionRef.current = newPos;
        setInternalNaviPosition(newPos);
      }
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationId);
  }, [externalNaviPosition]);

  // Build conversation list
  const conversationItems = useMemo(() => {
    const items: Array<{ id: string; role: 'user' | 'assistant'; text: string }> = [];

    messages.forEach((msg) => {
      items.push({
        id: msg.id,
        role: msg.role,
        text: msg.text,
      });
    });

    if (currentTurn && currentTurn.text.trim()) {
      items.push({
        id: currentTurn.id,
        role: currentTurn.role,
        text: currentTurn.text,
      });
    }

    return items;
  }, [messages, currentTurn]);

  // Auto-scroll to bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [conversationItems.length, currentTurn?.text, liveStatus]);

  return (
      <div className="flex flex-col overflow-hidden flex-1 min-h-0 relative justify-end gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-8 pb-4"
        >
          <h1 className="text-2xl font-semibold text-white/80 text-center flex-none">
            Navi
          </h1>
        </motion.div>
        {/* Chat messages container - flexible height */}
        <div className='flex-1 min-h-0 flex flex-col'>
          <div
            ref={scrollRef}
            className={cn(
              'flex-1 w-full',
              'flex flex-col gap-3 px-4 py-4 overflow-y-auto',
              'hide-scrollbar overscroll-contain touch-pan-y',
              'justify-end',
            )}
            style={{
              // Fade edges instead of hard cut
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 92%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 92%, transparent 100%)',
              minHeight: '200px',
              maxHeight: '100%',
            }}
          >
            <AnimatePresence mode="popLayout">
              {conversationItems.map((item, index) => (
                <ChatBubble
                  key={item.id}
                  role={item.role}
                  text={item.text}
                  naviPosition={naviPosition}
                  naviState={naviState}
                  index={index}
                />
              ))}

              {/* Show listening indicator when capturing */}
              {isCapturing && (!currentTurn || !currentTurn.text.trim()) && (
                <ListeningIndicator key="listening" naviState={naviState} />
              )}

              {/* Live status bubble (Navi's thinking status) */}
              {liveStatus && (
                <StatusBubble
                  key="live-status"
                  status={liveStatus}
                  naviPosition={naviPosition}
                  naviState={naviState}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Result Cards section - only shown when cards exist */}
        <AnimatePresence>
          {hasCards && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex-1 max-h-[120px]"
            >
              <ResultCards
                cards={activeCards!}
                onClose={onCloseCards}
                naviPosition={naviPosition}
                naviState={naviState}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
