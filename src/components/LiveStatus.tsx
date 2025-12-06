import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';

interface LiveStatusProps {
  status: string | null;
  onStatusChange?: () => void; // Called when a new status starts animating
}

// Individual word component with pulse animation
const PulsingWord = memo(function PulsingWord({
  word,
  index,
  totalWords,
  isExiting,
  onExitComplete,
}: {
  word: string;
  index: number;
  totalWords: number;
  isExiting: boolean;
  onExitComplete?: () => void;
}) {
  const [pulseIndex, setPulseIndex] = useState(-1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Staggered pulse animation loop
  useEffect(() => {
    if (isExiting) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Start pulsing after entrance animation
    const startDelay = setTimeout(() => {
      const runPulse = () => {
        setPulseIndex(0);
        let currentIdx = 0;

        intervalRef.current = setInterval(() => {
          currentIdx++;
          if (currentIdx < totalWords) {
            setPulseIndex(currentIdx);
          } else {
            setPulseIndex(-1);
            // Wait before next cycle
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimeout(runPulse, 1000);
          }
        }, 150);
      };

      // Stagger start based on word index
      setTimeout(runPulse, index * 50);
    }, 300 + index * 80);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index, totalWords, isExiting]);

  const isPulsing = pulseIndex === index;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={isExiting ? {
        opacity: 0,
        scale: 0.8,
        y: -10,
        transition: {
          duration: 0.3,
          delay: index * 0.05,
          ease: 'easeIn'
        }
      } : {
        opacity: isPulsing ? 1 : 0.5,
        scale: isPulsing ? 1.05 : 1,
        y: 0,
        transition: {
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
          y: { duration: 0.4, delay: index * 0.08, ease: 'easeOut' }
        }
      }}
      onAnimationComplete={() => {
        if (isExiting && index === totalWords - 1 && onExitComplete) {
          onExitComplete();
        }
      }}
      className="inline-block mx-1"
      style={{
        textShadow: isPulsing ? '0 0 20px rgba(0, 255, 136, 0.6), 0 0 40px rgba(0, 255, 136, 0.3)' : 'none',
      }}
    >
      {word}
    </motion.span>
  );
});

// Status display with queued transitions
const StatusDisplay = memo(function StatusDisplay({
  status,
  onExitComplete,
  isExiting,
}: {
  status: string;
  onExitComplete: () => void;
  isExiting: boolean;
}) {
  const words = status.split(' ');

  return (
    <div className="flex items-center justify-center flex-wrap">
      {words.map((word, index) => (
        <PulsingWord
          key={`${status}-${word}-${index}`}
          word={word}
          index={index}
          totalWords={words.length}
          isExiting={isExiting}
          onExitComplete={index === words.length - 1 ? onExitComplete : undefined}
        />
      ))}
    </div>
  );
});

export function LiveStatus({ status, onStatusChange }: LiveStatusProps) {
  // Queue of statuses to display
  const [statusQueue, setStatusQueue] = useState<string[]>([]);
  const [currentDisplayStatus, setCurrentDisplayStatus] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const pendingStatusRef = useRef<string | null>(null);
  const hasCalledChangeRef = useRef(false);

  // Add new status to queue
  useEffect(() => {
    if (status && status !== pendingStatusRef.current) {
      pendingStatusRef.current = status;
      setStatusQueue(prev => {
        // Don't add duplicates consecutively
        if (prev[prev.length - 1] === status) return prev;
        return [...prev, status];
      });
    } else if (!status && currentDisplayStatus) {
      // Status cleared - trigger exit
      setIsExiting(true);
    }
  }, [status, currentDisplayStatus]);

  // Process queue - show next status when ready
  useEffect(() => {
    if (statusQueue.length > 0 && !currentDisplayStatus && !isExiting) {
      const nextStatus = statusQueue[0];
      setCurrentDisplayStatus(nextStatus);
      setStatusQueue(prev => prev.slice(1));
      hasCalledChangeRef.current = false;

      // Notify parent of status change for wing spin
      if (onStatusChange) {
        onStatusChange();
      }
    }
  }, [statusQueue, currentDisplayStatus, isExiting, onStatusChange]);

  // Handle transition to next status in queue
  const handleExitComplete = useCallback(() => {
    setCurrentDisplayStatus(null);
    setIsExiting(false);

    // Check if there's a next status waiting
    if (statusQueue.length > 0) {
      // Will be processed by the effect above
    }
  }, [statusQueue.length]);

  // When there's a new status waiting and current is displaying, trigger exit
  useEffect(() => {
    if (statusQueue.length > 0 && currentDisplayStatus && !isExiting) {
      // Give current status minimum display time
      const minDisplayTime = setTimeout(() => {
        setIsExiting(true);
      }, 800); // Minimum time to show each status

      return () => clearTimeout(minDisplayTime);
    }
  }, [statusQueue, currentDisplayStatus, isExiting]);

  if (!currentDisplayStatus) return null;

  return (
    <div className="fixed inset-x-0 top-24 flex items-center justify-center pointer-events-none z-30">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-white font-medium text-lg px-6 py-3"
      >
        <StatusDisplay
          status={currentDisplayStatus}
          isExiting={isExiting}
          onExitComplete={handleExitComplete}
        />
      </motion.div>
    </div>
  );
}
