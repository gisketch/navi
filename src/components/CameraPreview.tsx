import { useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, SwitchCamera, Aperture, Video, VideoOff } from 'lucide-react';
import { cn, glass } from '../utils/glass';
import type { CameraMode, CameraFacing } from '../hooks/useCamera';

// ============================================
// Types
// ============================================

interface CameraPreviewProps {
  /** Ref to attach to the video element */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Whether camera is active */
  isActive: boolean;
  /** Current camera mode */
  mode: CameraMode;
  /** Current facing direction */
  facing: CameraFacing;
  /** Whether camera has permission */
  hasPermission: boolean | null;
  /** Error message if any */
  error: string | null;
  /** Callback to toggle camera on/off */
  onToggle: () => void;
  /** Callback to flip camera */
  onFlip: () => void;
  /** Callback to take snapshot */
  onSnapshot: () => void;
  /** Callback to toggle streaming mode */
  onToggleStreaming: () => void;
  /** Whether currently streaming frames */
  isStreaming: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================
// Component
// ============================================

export function CameraPreview({
  videoRef,
  isActive,
  mode,
  facing,
  hasPermission,
  error,
  onToggle,
  onFlip,
  onSnapshot,
  onToggleStreaming,
  isStreaming,
  className,
}: CameraPreviewProps) {
  const [showFlash, setShowFlash] = useState(false);

  // Flash effect on snapshot
  const handleSnapshot = () => {
      setShowFlash(true);
      onSnapshot();
      setTimeout(() => setShowFlash(false), 150);
    };

    return (
      <div className={cn('relative w-full h-full', className)}>
        {/* Camera container - fullscreen for AR mode */}
        <div className="relative w-full h-full overflow-hidden bg-black">
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              // Mirror front camera
              facing === 'user' && 'scale-x-[-1]'
            )}
          />

          {/* Inactive state overlay */}
          <AnimatePresence>
            {!isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80"
              >
                <CameraOff className="w-12 h-12 text-white/30 mb-3" />
                <p className="text-white/50 text-sm">
                  {error || 'Camera is off'}
                </p>
                {hasPermission === false && (
                  <p className="text-red-400/70 text-xs mt-2">
                    Please grant camera permission
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flash effect for snapshot */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 bg-white pointer-events-none z-20"
              />
            )}
          </AnimatePresence>

          {/* Streaming indicator */}
          <AnimatePresence>
            {isActive && isStreaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30"
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
                <span className="text-xs text-red-400 font-medium">LIVE</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode indicator */}
          <AnimatePresence>
            {isActive && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30"
              >
                <Aperture className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-cyan-400 font-medium">SNAPSHOT</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera controls overlay */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 right-3 flex gap-2"
              >
                {/* Toggle streaming */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleStreaming}
                  data-interactive
                  className={cn(
                    'p-2 rounded-full',
                    glass.blur.xl,
                    'bg-black/30 border',
                    isStreaming
                      ? 'border-red-400/30'
                      : 'border-cyan-400/30',
                    'transition-all duration-200'
                  )}
                >
                  {isStreaming ? (
                    <Video className="w-4 h-4 text-red-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-cyan-400" />
                  )}
                </motion.button>

                {/* Snapshot button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSnapshot}
                  data-interactive
                  className={cn(
                    'p-2 rounded-full',
                    glass.blur.xl,
                    'bg-black/30 border border-white/20',
                    'transition-all duration-200'
                  )}
                >
                  <Aperture className="w-4 h-4 text-white/80" />
                </motion.button>

                {/* Flip camera */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onFlip}
                  data-interactive
                  className={cn(
                    'p-2 rounded-full',
                    glass.blur.xl,
                    'bg-black/30 border border-white/20',
                    'transition-all duration-200'
                  )}
                >
                  <SwitchCamera className="w-4 h-4 text-white/80" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
}
