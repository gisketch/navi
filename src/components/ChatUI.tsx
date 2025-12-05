import { useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import type { ChatMessage } from '../utils/constants';

interface ChatUIProps {
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  isCapturing: boolean;
}

const MagicText = memo(function MagicText({
  text,
  messageId,
  className,
  transition
}: {
  text: string;
  messageId: string;
  className?: string;
  transition?: Transition
}) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const wordCounts = useRef(new Map<string, number>()).current;

  // Reset counts for each render
  wordCounts.clear();

  return (
    <span className={className}>
      {words.map((word, index) => {
        const isSpace = word === ' ';

        // Generate a stable ID based on content + occurrence index
        // This ensures "is" only morphs into "is", even if indices shift due to trimming
        const currentCount = wordCounts.get(word) || 0;
        wordCounts.set(word, currentCount + 1);

        const layoutId = `${messageId}-${word}-${currentCount}`;

        return (
          <motion.span
            key={`${layoutId}-${index}`} // unique key for React
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            layoutId={layoutId}
            transition={transition || {
              layout: {
                duration: 0.25,
                delay: index * 0.005
              },
            }}
            className="inline-block"
          >
            {isSpace ? '\u00A0' : word}
          </motion.span>
        );
      })}
    </span>
  );
});

export function ChatUI({ messages, currentTurn, isCapturing }: ChatUIProps) {
  // Get the ID of the current turn to exclude it from aboveMessage
  const currentTurnId = currentTurn?.id;
  
  // Find the last message that is NOT the current turn
  // This prevents the same message from appearing in both spots simultaneously
  const aboveMessage = useMemo(() => {
    if (messages.length === 0) return null;
    
    // Filter out any message that matches the currentTurn ID
    // This handles the brief moment when message is added but currentTurn hasn't cleared yet
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id !== currentTurnId) {
        return messages[i];
      }
    }
    return null;
  }, [messages, currentTurnId]);

  // Determine content for the Below spot
  const belowContent = useMemo(() => {
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
    <div className="flex flex-1 flex-col p-6 overflow-hidden relative">
      {/* ABOVE SPOT (History) */}
      <div className="flex-1 flex flex-col justify-end pb-8 min-h-0">
        <AnimatePresence mode="popLayout">
          {aboveMessage && (
            <motion.div
              key={aboveMessage.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`w-full text-xl font-medium ${
                aboveMessage.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <MagicText
                text={aboveMessage.text}
                messageId={aboveMessage.id}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BELOW SPOT (Active) */}
      <div className="flex-[2] flex flex-col justify-start pt-4 min-h-0">
        <AnimatePresence mode="wait">
          {belowContent ? (
            <motion.div
              key={belowContent.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: belowContent.isPlaceholder ? 0.5 : 1,
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full text-center"
            >
              <div className={`text-4xl font-medium leading-tight tracking-tight text-white ${
                belowContent.isPlaceholder ? 'animate-pulse' : ''
              }`}>
                <MagicText
                  text={belowContent.text}
                  messageId={belowContent.id}
                  transition={{
                    layout: { duration: 0 },
                    opacity: { duration: 0.5 },
                    y: { duration: 0.5 },
                  }}
                />
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
