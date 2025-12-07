import { useMemo, memo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, CardData } from '../utils/constants';
import { ResultCards } from './ResultCards';

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
  activeCards?: CardData[];
  onCloseCards?: () => void;
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

// Get main button position (bottom of screen)
const getButtonPosition = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight - 80;
  return { x: centerX, y: centerY };
};

// Individual word component that calculates its own position
const Word = memo(function Word({
  word,
  index,
  messageId,
  role,
  naviPosition,
}: {
  word: string;
  index: number;
  messageId: string;
  role: 'user' | 'assistant';
  naviPosition: { x: number; y: number };
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [offsets, setOffsets] = useState({ toNavi: { x: 0, y: 0 }, fromButton: { y: 0 }, fromNavi: { x: 0, y: 0 } });
  const isSpace = word === ' ';

  // Calculate this specific word's offset to Navi center
  useLayoutEffect(() => {
    if (ref.current && !isSpace) {
      const rect = ref.current.getBoundingClientRect();
      const wordCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const buttonPos = getButtonPosition();

      setOffsets({
        toNavi: {
          x: naviPosition.x - wordCenter.x,
          y: naviPosition.y - wordCenter.y
        },
        fromButton: {
          y: buttonPos.y - wordCenter.y
        },
        fromNavi: {
          x: naviPosition.x - wordCenter.x,
          y: naviPosition.y - wordCenter.y
        }
      });
    }
  }, [isSpace, naviPosition.x, naviPosition.y]);

  const wordDelay = index * 0.02;

  if (role === 'user') {
    // User input: words come from button area, exit towards Navi CENTER
    return (
      <motion.span
        ref={ref}
        key={`${messageId}-${index}`}
        initial={{
          opacity: 0,
          y: offsets.fromButton.y * 0.3,
          scale: 0.5,
        }}
        animate={{
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: offsets.toNavi.y,
          x: offsets.toNavi.x,
          scale: 0,
          transition: {
            duration: 0.5,
            delay: index * 0.015,
            ease: [0.4, 0, 0.2, 1]
          }
        }}
        transition={{
          duration: 0.4,
          delay: wordDelay,
          ease: [0.2, 0.8, 0.2, 1]
        }}
        className="inline-block"
      >
        {isSpace ? '\u00A0' : word}
      </motion.span>
    );
  } else {
    // Assistant output: words emerge from Navi, exit by fading down
    return (
      <motion.span
        ref={ref}
        key={`${messageId}-${index}`}
        initial={{
          opacity: 0,
          y: offsets.fromNavi.y,
          x: offsets.fromNavi.x,
          scale: 0.3,
        }}
        animate={{
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 30,
          transition: {
            duration: 0.3,
            delay: index * 0.01,
            ease: 'easeIn'
          }
        }}
        transition={{
          duration: 0.5,
          delay: wordDelay,
          ease: [0.2, 0.8, 0.2, 1]
        }}
        className="inline-block"
      >
        {isSpace ? '\u00A0' : word}
      </motion.span>
    );
  }
});

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

const MagicText = memo(function MagicText({
  text,
  messageId,
  className,
  role,
  naviPosition,
}: {
  text: string;
  messageId: string;
  className?: string;
  role: 'user' | 'assistant';
  naviPosition: { x: number; y: number };
}) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const wordCounts = useRef(new Map<string, number>()).current;

  // Reset counts for each render
  wordCounts.clear();

  return (
    <span className={className}>
      {words.map((word, index) => {
        const currentCount = wordCounts.get(word) || 0;
        wordCounts.set(word, currentCount + 1);

        return (
          <Word
            key={`${messageId}-${word}-${currentCount}-${index}`}
            word={word}
            index={index}
            messageId={messageId}
            role={role}
            naviPosition={naviPosition}
          />
        );
      })}
    </span>
  );
});

export function ChatUI({ currentTurn, isCapturing, activeCards, onCloseCards }: ChatUIProps) {
  // Track Navi's real position, updated periodically
  const [naviPosition, setNaviPosition] = useState(() => getNaviPosition());
  const lastPositionRef = useRef(naviPosition);

  // Update Navi position periodically (for when Navi moves)
  // Optimized: only trigger re-render when position actually changes
  useLayoutEffect(() => {
    let animationId: number;
    const tick = () => {
      const newPos = getNaviPosition();
      // Only update state if position changed significantly (> 1px)
      if (
        Math.abs(newPos.x - lastPositionRef.current.x) > 1 ||
        Math.abs(newPos.y - lastPositionRef.current.y) > 1
      ) {
        lastPositionRef.current = newPos;
        setNaviPosition(newPos);
      }
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Determine content for display
  const content = useMemo(() => {
    if (currentTurn) {
      return {
        id: currentTurn.id,
        role: currentTurn.role,
        text: currentTurn.text,
        isPlaceholder: false
      };
    }
    if (isCapturing) {
      return {
        id: 'listening-placeholder',
        role: 'user' as const,
        text: 'Listening...',
        isPlaceholder: true
      };
    }
    return null;
  }, [currentTurn, isCapturing]);

  // Auto-scroll to bottom of chat
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [content?.text, content?.id]);

  return (
    <div className="flex flex-1 flex-col py-6 overflow-hidden relative justify-start">
      {/* Single centered text area */}
      <div className="flex flex-col items-center justify-between h-[24em] pt-48 w-full max-w-4xl mx-auto flex-1">
        <AnimatePresence mode="wait">
          {content ? (
            <motion.div
              key={content.id}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              className="w-full text-center flex flex-col items-center gap-8 px-6 max-h-72 overflow-y-auto hide-scrollbar overscroll-contain touch-pan-y pt-12 pb-12"
              ref={scrollRef}
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
              }}
            >
              <div className={`text-2xl font-medium leading-tight tracking-tight text-white ${content.isPlaceholder ? 'animate-pulse opacity-50' : ''
                }`}>
                {content.isPlaceholder ? (
                  <span>{content.text}</span>
                ) : (
                  <MagicText
                    text={content.text}
                    messageId={content.id}
                    role={content.role}
                    naviPosition={naviPosition}
                  />
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-center"
            />
          )}
        </AnimatePresence>

        {/* Render Cards outside AnimatePresence of text, so they persist */}
        <AnimatePresence>
          {activeCards && activeCards.length > 0 && (
          <ResultCards cards={activeCards} onClose={onCloseCards} />
           )}
        </AnimatePresence>

      </div>
    </div>
  );
}
