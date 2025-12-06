import { useMemo, memo, useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../utils/constants';

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
}

// Get Navi's approximate center position (relative to viewport)
const getNaviPosition = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.2 + window.innerHeight * 0.2 * 0.1; // pt-[20vh] + some offset
  return { x: centerX, y: centerY };
};

// Get main button position (bottom of screen)
const getButtonPosition = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight - 80; // Approximate button position
  return { x: centerX, y: centerY };
};

// Individual word component that calculates its own position
const Word = memo(function Word({
  word,
  index,
  messageId,
  role,
  wordCount,
}: {
  word: string;
  index: number;
  messageId: string;
  role: 'user' | 'assistant';
  wordCount: number;
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
      
      const naviPos = getNaviPosition();
      const buttonPos = getButtonPosition();
      
      setOffsets({
        toNavi: {
          x: naviPos.x - wordCenter.x,
          y: naviPos.y - wordCenter.y
        },
        fromButton: {
          y: buttonPos.y - wordCenter.y
        },
        fromNavi: {
          x: naviPos.x - wordCenter.x,
          y: naviPos.y - wordCenter.y
        }
      });
    }
  }, [isSpace]);

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

const MagicText = memo(function MagicText({
  text,
  messageId,
  className,
  role,
}: {
  text: string;
  messageId: string;
  className?: string;
  role: 'user' | 'assistant';
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
            wordCount={currentCount}
          />
        );
      })}
    </span>
  );
});

export function ChatUI({ messages, currentTurn, isCapturing }: ChatUIProps) {
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

  return (
    <div className="flex flex-1 flex-col p-6 overflow-hidden relative justify-center">
      {/* Single centered text area */}
      <div className="flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {content ? (
            <motion.div
              key={content.id}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              className="w-full text-center"
            >
              <div className={`text-4xl font-medium leading-tight tracking-tight text-white ${
                content.isPlaceholder ? 'animate-pulse opacity-50' : ''
              }`}>
                {content.isPlaceholder ? (
                  <span>{content.text}</span>
                ) : (
                  <MagicText
                    text={content.text}
                    messageId={content.id}
                    role={content.role}
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
      </div>
    </div>
  );
}
