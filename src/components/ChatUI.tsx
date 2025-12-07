import { useMemo, memo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, CardData } from '../utils/constants';
import { ResultCards } from './ResultCards';
import { cn, glass, rounded, calculateProximityGlow, createGlowGradient } from '../utils/glass';

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
  activeCards?: CardData[];
  onCloseCards?: () => void;
  naviPosition?: { x: number; y: number };
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
  // Fallback if element not found
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.25 };
};

// ============================================
// Chat Bubble Component with Glassmorphism
// ============================================
interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  naviPosition: { x: number; y: number };
  index: number;
}

const ChatBubble = memo(function ChatBubble({
  role,
  text,
  naviPosition,
  index,
}: ChatBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  // Calculate proximity glow based on Navi position
  useLayoutEffect(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, 350);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition.x, naviPosition.y]);

  const isUser = role === 'user';

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
        delay: index * 0.05,
      }}
      className={cn(
        'relative max-w-[85%] px-4 py-3',
        rounded.lg,
        // User: right-aligned, almost clear glass
        isUser
          ? 'self-end bg-white/[0.06] border border-white/[0.12] backdrop-blur-xl'
          : 'self-start bg-white/[0.10] border border-white/[0.15] backdrop-blur-2xl'
      )}
      style={{
        // Proximity glow effect
        boxShadow: glowIntensity > 0.05
          ? `inset 0 0 ${20 * glowIntensity}px rgba(34, 211, 238, ${glowIntensity * 0.15}), 0 0 ${30 * glowIntensity}px rgba(34, 211, 238, ${glowIntensity * 0.2})`
          : !isUser
            ? '0 0 20px rgba(34, 211, 238, 0.1)' // Subtle default glow for Navi
            : 'none',
      }}
    >
      {/* Proximity glow gradient overlay */}
      {glowIntensity > 0.05 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition),
          }}
        />
      )}

      {/* Navi bubble top highlight */}
      {!isUser && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent rounded-t-xl" />
      )}

      {/* Role indicator */}
      <div className={cn(
        'text-[10px] font-medium uppercase tracking-wider mb-1',
        isUser ? 'text-white/40' : 'text-cyan-400/60'
      )}>
        {isUser ? 'Ghegi' : 'Navi'}
      </div>

      {/* Message text */}
      <p className={cn(
        'text-sm leading-relaxed',
        isUser ? 'text-white/80' : 'text-white/90'
      )}>
        {text}
      </p>
    </motion.div>
  );
});

// ============================================
// Listening Indicator
// ============================================
const ListeningIndicator = memo(function ListeningIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'self-end max-w-[85%] px-4 py-3',
        rounded.lg,
        'bg-white/[0.04]',
        'border border-white/[0.08]',
        glass.blur.xl,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider mb-1 text-white/40">
        You
      </div>
      <div className="flex items-center gap-1.5">
        {/* <span className="text-sm text-white/50">Listening</span> */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
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
}: ChatUIProps) {
  // Track Navi's real position
  const [internalNaviPosition, setInternalNaviPosition] = useState(() => getNaviPosition());
  const lastPositionRef = useRef(internalNaviPosition);

  // Use external position if provided, otherwise track internally
  const naviPosition = externalNaviPosition || internalNaviPosition;

  // Update Navi position periodically (for when Navi moves)
  useLayoutEffect(() => {
    if (externalNaviPosition) return; // Skip if external position provided

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

  // Build conversation list: past messages + current turn
  const conversationItems = useMemo(() => {
    const items: Array<{ id: string; role: 'user' | 'assistant'; text: string }> = [];

    // Add past messages
    messages.forEach((msg) => {
      items.push({
        id: msg.id,
        role: msg.role,
        text: msg.text,
      });
    });

    // Add current turn if exists
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
  }, [conversationItems.length, currentTurn?.text]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {/* Chat messages container */}
      <div
        ref={scrollRef}
        className={cn(
          'flex flex-col gap-3 px-4 py-6 overflow-y-auto flex-1',
          'hide-scrollbar overscroll-contain touch-pan-y',
          // Add padding for Navi at top
          'pt-32'
        )}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {conversationItems.map((item, index) => (
            <ChatBubble
              key={item.id}
              role={item.role}
              text={item.text}
              naviPosition={naviPosition}
              index={index}
            />
          ))}

          {/* Show listening indicator when capturing but no current turn text */}
          {isCapturing && (!currentTurn || !currentTurn.text.trim()) && (
            <ListeningIndicator key="listening" />
          )}
        </AnimatePresence>
      </div>

      {/* Result Cards overlay */}
      <AnimatePresence>
        {activeCards && activeCards.length > 0 && (
          <div className="absolute bottom-24 left-0 right-0 px-4">
            <ResultCards cards={activeCards} onClose={onCloseCards} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
