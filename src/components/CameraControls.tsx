import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SwitchCamera, MessageSquare, MessageSquareOff } from 'lucide-react';

// ============================================
// Types
// ============================================

interface CameraControlsProps {
  /** Whether controls should be visible */
  isVisible: boolean;
  /** Whether chat bubbles are visible */
  isChatVisible: boolean;
  /** Callback to toggle chat visibility */
  onToggleChat: () => void;
  /** Callback to flip camera */
  onFlipCamera: () => void;
}

// ============================================
// Component - Renders via Portal to document.body
// Uses native DOM events to bypass any React event issues
// ============================================

export function CameraControls({
  isVisible,
  isChatVisible,
  onToggleChat,
  onFlipCamera,
}: CameraControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const flipButtonRef = useRef<HTMLButtonElement>(null);

  // Use native DOM event listeners to ensure touch events work
  useEffect(() => {
    const chatBtn = chatButtonRef.current;
    const flipBtn = flipButtonRef.current;

    if (!chatBtn || !flipBtn) return;

    // Prevent all event propagation at capture phase
    const preventPropagation = (e: Event) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const handleChatClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onToggleChat();
    };

    const handleFlipClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onFlipCamera();
    };

    // Add listeners with capture phase to intercept before anything else
    chatBtn.addEventListener('touchstart', preventPropagation, { capture: true });
    chatBtn.addEventListener('touchend', handleChatClick, { capture: true });
    chatBtn.addEventListener('mousedown', preventPropagation, { capture: true });
    chatBtn.addEventListener('click', handleChatClick, { capture: true });

    flipBtn.addEventListener('touchstart', preventPropagation, { capture: true });
    flipBtn.addEventListener('touchend', handleFlipClick, { capture: true });
    flipBtn.addEventListener('mousedown', preventPropagation, { capture: true });
    flipBtn.addEventListener('click', handleFlipClick, { capture: true });

    return () => {
      chatBtn.removeEventListener('touchstart', preventPropagation, { capture: true });
      chatBtn.removeEventListener('touchend', handleChatClick, { capture: true });
      chatBtn.removeEventListener('mousedown', preventPropagation, { capture: true });
      chatBtn.removeEventListener('click', handleChatClick, { capture: true });

      flipBtn.removeEventListener('touchstart', preventPropagation, { capture: true });
      flipBtn.removeEventListener('touchend', handleFlipClick, { capture: true });
      flipBtn.removeEventListener('mousedown', preventPropagation, { capture: true });
      flipBtn.removeEventListener('click', handleFlipClick, { capture: true });
    };
  }, [onToggleChat, onFlipCamera]);

  // Render via portal to document.body
  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          data-camera-controls
          style={{
            position: 'fixed',
            bottom: '7rem', // 112px, above navbar
            right: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 9999, // Maximum z-index to ensure it's on top
            pointerEvents: 'auto',
          }}
        >
          {/* Toggle chat visibility */}
          <button
            ref={chatButtonRef}
            data-interactive
            style={{
              padding: '0.75rem',
              borderRadius: '9999px',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: isChatVisible 
                ? '1px solid rgba(34, 211, 238, 0.3)' 
                : '1px solid rgba(251, 191, 36, 0.3)',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isChatVisible ? (
              <MessageSquare style={{ width: 20, height: 20, color: 'rgb(34, 211, 238)' }} />
            ) : (
              <MessageSquareOff style={{ width: 20, height: 20, color: 'rgb(251, 191, 36)' }} />
            )}
          </button>

          {/* Flip camera */}
          <button
            ref={flipButtonRef}
            data-interactive
            style={{
              padding: '0.75rem',
              borderRadius: '9999px',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SwitchCamera style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.8)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
