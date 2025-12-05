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
  // Identify key messages for the Two-Spot layout
  const aboveMessage = messages.length > 0 ? messages[messages.length - 1] : null;

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
        role: 'user',
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
              initial={{}}
              animate={{ opacity: 0.6, y: 0 }} // Faded and slightly smaller
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`w-full text-xl font-medium ${ // Unify weight: font-medium
                aboveMessage.role === 'user' ? 'text-right' : 'text-left'
                }`}
            >
              <MagicText
                text={aboveMessage.text}
                messageId={aboveMessage.id}
              // Standard transitions for the "Above" spot
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BELOW SPOT (Active) */}
      <div className="flex-[2] flex flex-col justify-start pt-4 min-h-0">
        <AnimatePresence mode="popLayout">
          {belowContent ? (
            <motion.div
              key={belowContent.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: belowContent.isPlaceholder ? 0.5 : 1,
              }}
              exit={{ opacity: 0.6, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full text-center"
            >
              <div className={`text-4xl font-medium leading-tight tracking-tight text-white ${ // Unify weight: font-medium
                belowContent.isPlaceholder ? 'animate-pulse' : ''
                }`}>
                <MagicText
                  text={belowContent.text}
                  messageId={belowContent.id}
                  // Overrides for the "Below" spot to prevent sliding
                  transition={{
                    layout: { duration: 0 }, // SNAP into place when container grows
                    opacity: { duration: 0.5 }, // Fade in nicely
                    y: { duration: 0.5 }, // Fade in nicely
                  }}
                />
              </div>
            </motion.div>
          ) : (
            // Empty state or "Thinking..." could go here if we wanted strictly nothing
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-center"
            >
              {/* Optional: Add a subtle hint if totally idle? User didn't ask for it specifically here. */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
