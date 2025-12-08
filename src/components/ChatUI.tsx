import { useMemo, memo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
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
const GLOW_MAX_DISTANCE_CHAT = 700;

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
  activeCards?: CardData[];
  onDismissCards?: () => void;
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

  useLayoutEffect(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, GLOW_MAX_DISTANCE_CHAT);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition.x, naviPosition.y]);

  const isUser = role === 'user';
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
      // Mark individual bubbles as interactive (blocks Navi touch)
      data-chat-bubble
      className={cn(
        'relative max-w-[85%] px-4 py-3',
        rounded.lg,
        isUser
          ? 'self-end bg-gray/30 border border-white/[0.08] backdrop-blur-xl'
          : 'self-start bg-cyan-950/40 border border-cyan-400/[0.15] backdrop-blur-2xl'
      )}
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

      {/* Navi bubble top highlight */}
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
      data-chat-bubble
      className={cn(
        'self-start max-w-[85%] px-4 py-3',
        rounded.lg,
        'bg-emerald-950/30 border-gray/20 backdrop-blur-2xl'
      )}
      style={{
        borderColor: `${primaryColor}30`,
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
      data-chat-bubble
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
  onDismissCards,
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

  // ============================================
  // Drag-to-Scroll with proper constraints
  // ============================================
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);

  // Raw drag position (negative = scrolled up/towards older messages)
  const rawY = useMotionValue(0);
  // Smoothed position with spring
  const y = useSpring(rawY, { damping: 30, stiffness: 300 });

  // Calculate max scroll distance
  useEffect(() => {
    const updateMaxScroll = () => {
      if (containerRef.current && contentRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        const max = Math.max(0, contentHeight - containerHeight);
        setMaxScroll(max);
      }
    };

    updateMaxScroll();
    const observer = new ResizeObserver(updateMaxScroll);
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    return () => observer.disconnect();
  }, [conversationItems.length, currentTurn?.text, liveStatus]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Set Y to show the bottom (most negative value)
    if (maxScroll > 0) {
      rawY.set(-maxScroll);
    }
  }, [conversationItems.length, currentTurn?.text, liveStatus, maxScroll, rawY]);

  // Handle drag
  const handleDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = rawY.get();
    let newY = currentY + info.delta.y;

    // Elastic resistance at boundaries
    if (newY > 0) {
      // Pulling down past top - elastic
      newY = newY * 0.3;
    } else if (newY < -maxScroll) {
      // Pulling up past bottom - elastic
      const overscroll = -maxScroll - newY;
      newY = -maxScroll - overscroll * 0.3;
    }

    rawY.set(newY);
  }, [rawY, maxScroll]);

  // Handle drag end
  const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = rawY.get();
    const velocity = info.velocity.y;

    // Apply momentum
    let targetY = currentY + velocity * 0.2;

    // Clamp to valid range
    targetY = Math.max(-maxScroll, Math.min(0, targetY));

    rawY.set(targetY);
  }, [rawY, maxScroll]);

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

  return (
    <div className="flex flex-col overflow-hidden flex-1 min-h-0 relative justify-end gap-4 touch-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-8 pb-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 20px) + 12px)',
        }}
      >
        <h1 className="text-2xl font-semibold text-white/80 text-center flex-none">
          Navi
        </h1>
      </motion.div>

      {/* Chat messages container */}
      <div
        ref={containerRef}
        className='flex-1 min-h-0 overflow-hidden pb-16'
        style={{
          // Fade edges
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)',
        }}
      >
        {/* Draggable content - only blocks Navi when touching bubbles inside */}
        <motion.div
          ref={contentRef}
          drag="y"
          dragMomentum={false}
          dragElastic={0}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className={cn(
            'flex flex-col gap-3 px-4 py-4 min-h-full justify-end',
            'cursor-grab active:cursor-grabbing',
            'touch-none select-none',
          )}
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

            {/* Live status bubble */}
            {liveStatus && (
              <StatusBubble
                key="live-status"
                status={liveStatus}
                naviPosition={naviPosition}
                naviState={naviState}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Result Cards section */}
      <AnimatePresence>
        {hasCards && (
          <motion.div
            layout
            initial={{ opacity: 0, x: 30, height: 0, marginTop: -16 }}
            animate={{ opacity: 1, x: 0, height: 'auto', marginTop: 0 }}
            exit={{
              opacity: 0,
              x: 50, // Move out slightly further
              height: 0,
              marginTop: -16,
              transition: {
                height: { duration: 0.3, ease: "anticipate" }, // Special handling for height
                default: { duration: 0.2 }
              }
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-shrink-0 origin-bottom overflow-hidden"
          >
            <ResultCards
              cards={activeCards!}
              onDismiss={onDismissCards}
              naviPosition={naviPosition}
              naviState={naviState}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
