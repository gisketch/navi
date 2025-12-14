import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, rounded, calculateProximityGlow, createGlowGradient } from '../utils/glass';
import type { NaviState } from './Navi';

// ============================================
// Navi State Colors (synced with ChatUI.tsx and Navi.tsx)
// ============================================
const naviStateColors = {
  offline: { glow: 'rgba(255,255,255,0.3)', primary: 'rgb(255,255,255)' },
  idle: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
  listening: { glow: 'rgba(255, 221, 0, 0.4)', primary: 'rgb(255, 221, 0)' },
  thinking: { glow: 'rgba(0, 255, 136, 0.4)', primary: 'rgb(0, 255, 136)' },
  speaking: { glow: 'rgba(34, 211, 238, 0.4)', primary: 'rgb(34, 211, 238)' },
};

const GLOW_MAX_DISTANCE = 500;

// ============================================
// Task Voice Overlay
// ============================================
// Overlay shown when using voice in Focus/Task tab
// Similar to FinanceVoiceOverlay but for task management
// - Gradient dim from bottom to top
// - Navi repositions to center
// - Shows live transcription with ChatUI-style bubbles

interface TaskVoiceOverlayProps {
  isOpen: boolean;

  // Transcription
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  liveStatus: string | null;

  // For glow calculations
  naviPosition?: { x: number; y: number };
  naviState?: NaviState;
}

// ============================================
// Transcript Bubble (ChatUI-style)
// ============================================
interface TranscriptBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  naviPosition?: { x: number; y: number };
  naviState: NaviState;
}

function TranscriptBubble({ role, text, naviPosition, naviState }: TranscriptBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const stateColor = naviStateColors[naviState] || naviStateColors.idle;

  useLayoutEffect(() => {
    if (bubbleRef.current && naviPosition) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, GLOW_MAX_DISTANCE);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition?.x, naviPosition?.y, naviPosition]);

  const isUser = role === 'user';
  const glowColor = stateColor.glow;
  const primaryColor = stateColor.primary;

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={cn(
        'relative max-w-md mx-4 px-4 py-3',
        rounded.lg,
        isUser
          ? 'self-end bg-gray/30 border border-white/[0.08] backdrop-blur-xl'
          : 'self-start bg-purple-950/40 border border-purple-400/[0.15] backdrop-blur-2xl'
      )}
    >
      {/* Proximity glow gradient overlay */}
      {glowIntensity > 0.03 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition, glowColor.replace('0.4', `${glowIntensity * 0.2}`)),
          }}
        />
      )}

      {/* Navi bubble top highlight */}
      {!isUser && (
        <div
          className="absolute inset-x-0 top-0 h-px rounded-t-lg"
          style={{
            background: `linear-gradient(to right, transparent, ${primaryColor}40, transparent)`
          }}
        />
      )}

      {/* Role indicator */}
      <div className={cn(
        'text-[10px] font-medium uppercase tracking-wider mb-1',
        isUser ? 'text-white/30' : 'text-purple-400/50'
      )}
        style={!isUser ? { color: `${primaryColor}80` } : undefined}
      >
        {isUser ? 'You' : 'Navi'}
      </div>

      {/* Message text with cursor */}
      <p className={cn(
        'text-sm leading-relaxed',
        isUser ? 'text-white/70' : 'text-white/90'
      )}>
        {text}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="ml-0.5"
        >
          ▊
        </motion.span>
      </p>
    </motion.div>
  );
}

// ============================================
// Status Bubble (Navi thinking indicator)
// ============================================
interface StatusBubbleProps {
  status: string;
  naviPosition?: { x: number; y: number };
  naviState: NaviState;
}

function StatusBubble({ status, naviPosition, naviState }: StatusBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const stateColor = naviStateColors[naviState] || naviStateColors.thinking;
  const glowColor = stateColor.glow;
  const primaryColor = stateColor.primary;

  useLayoutEffect(() => {
    if (bubbleRef.current && naviPosition) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const glow = calculateProximityGlow(rect, naviPosition, GLOW_MAX_DISTANCE);
      setGlowIntensity(glow.intensity);
      setGlowPosition(glow.position);
    }
  }, [naviPosition?.x, naviPosition?.y, naviPosition]);

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={cn(
        'relative px-4 py-2',
        rounded.full,
        'border',
        'text-sm font-medium'
      )}
      style={{
        backgroundColor: `${primaryColor}15`,
        borderColor: `${primaryColor}30`,
        color: primaryColor,
      }}
    >
      {/* Proximity glow */}
      {glowIntensity > 0.03 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-full overflow-hidden"
          style={{
            background: createGlowGradient(glowPosition, glowColor.replace('0.4', `${glowIntensity * 0.3}`)),
          }}
        />
      )}

      {/* Pulsing dot */}
      <span className="relative flex items-center gap-2">
        <motion.span
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
        {status}
      </span>
    </motion.div>
  );
}

export function TaskVoiceOverlay({
  isOpen,
  currentTurn,
  liveStatus,
  naviPosition,
  naviState = 'idle',
}: TaskVoiceOverlayProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  // Auto-show transcript when there's content
  useEffect(() => {
    if (currentTurn?.text || liveStatus) {
      setShowTranscript(true);
    }
  }, [currentTurn, liveStatus]);

  // Hide transcript after inactivity
  useEffect(() => {
    if (!currentTurn && !liveStatus) {
      const timer = setTimeout(() => setShowTranscript(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, liveStatus]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-30 pointer-events-none"
        >
          {/* Backdrop with blur and gradient dim - purple tint for tasks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-md"
            style={{
              background: 'linear-gradient(to top, rgba(20,0,30,0.9) 0%, rgba(10,0,20,0.7) 40%, rgba(0,0,10,0.4) 70%, rgba(0,0,0,0.2) 100%)',
            }}
          />

          {/* Transcription area - positioned below Navi */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-32 pb-40 pointer-events-auto">
            {/* Live Status */}
            <AnimatePresence mode="wait">
              {liveStatus && (
                <div className="mb-4">
                  <StatusBubble
                    status={liveStatus}
                    naviPosition={naviPosition}
                    naviState={naviState}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Transcription bubble */}
            <AnimatePresence mode="wait">
              {showTranscript && currentTurn && (
                <TranscriptBubble
                  role={currentTurn.role}
                  text={currentTurn.text}
                  naviPosition={naviPosition}
                  naviState={naviState}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
