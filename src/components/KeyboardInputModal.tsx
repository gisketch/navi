import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { cn, glass, rounded } from '../utils/glass';

interface KeyboardInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  isConnected: boolean;
}

export function KeyboardInputModal({
  isOpen,
  onClose,
  onSend,
  isConnected,
}: KeyboardInputModalProps) {
  const [textInput, setTextInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set CSS variables for safe area
  useEffect(() => {
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
  }, []);

  // Handle virtual keyboard on iOS
  useEffect(() => {
    if (!isOpen) return;

    // Use visualViewport API for accurate keyboard detection
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const estimatedKeyboardHeight = windowHeight - viewportHeight;
        setKeyboardHeight(Math.max(0, estimatedKeyboardHeight));
      }
    };

    // Add listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    // Initial check
    handleViewportChange();

    // Focus textarea when modal opens
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (textInput.trim() && isConnected) {
      onSend(textInput.trim());
      setTextInput('');
      onClose();
    }
  }, [textInput, isConnected, onSend, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop - page content stays fixed */}
          <motion.div
            key="keyboard-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal container - positioned to account for keyboard */}
          <motion.div
            key="keyboard-modal"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed left-0 right-0 z-[101] px-4"
            style={{
              // Position above keyboard with safe area consideration
              top: `calc(env(safe-area-inset-top, 20px) + 12px)`,
              bottom: keyboardHeight > 0 ? `${keyboardHeight + 12}px` : 'auto',
              maxHeight: keyboardHeight > 0 
                ? `calc(100vh - ${keyboardHeight}px - env(safe-area-inset-top, 20px) - 24px)`
                : '50vh',
            }}
          >
            <div className="max-w-lg mx-auto h-full flex flex-col">
              {/* Modal content with glassmorphism */}
              <div
                className={cn(
                  'relative flex flex-col overflow-hidden',
                  rounded.xl,
                  glass.blur['2xl'],
                  'bg-white/[0.06] border border-white/[0.12]',
                  'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
                )}
              >
                {/* Top glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-400/20 blur-3xl pointer-events-none" />

                {/* Top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                  <h3 className="text-sm font-medium text-white/70">Type a message</h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={cn(
                      'p-2',
                      rounded.full,
                      glass.bg.light,
                      'border border-white/[0.1]',
                      'text-white/60 hover:text-white hover:bg-white/[0.15]',
                      'transition-all duration-200'
                    )}
                  >
                    <X size={16} />
                  </motion.button>
                </div>

                {/* Text input area */}
                <div className="flex-1 p-4 min-h-0">
                  <textarea
                    ref={textareaRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message here..."
                    disabled={!isConnected}
                    className={cn(
                      'w-full h-full min-h-[100px] max-h-[200px]',
                      'bg-transparent border-none resize-none',
                      'text-white placeholder-white/40',
                      'focus:ring-0 focus:outline-none',
                      'text-base leading-relaxed',
                      'select-text'
                    )}
                  />
                </div>

                {/* Footer with send button */}
                <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/[0.08]">
                  {/* Character count */}
                  <span className="text-xs text-white/30 mr-auto">
                    {textInput.length > 0 && `${textInput.length} characters`}
                  </span>

                  {/* Send button - glassmorphism cyan */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSend}
                    disabled={!isConnected || !textInput.trim()}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5',
                      rounded.lg,
                      'backdrop-blur-xl',
                      'bg-cyan-500/20 border border-cyan-400/30',
                      'text-cyan-300 hover:text-cyan-200',
                      'hover:bg-cyan-500/30 hover:border-cyan-400/40',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'disabled:hover:bg-cyan-500/20 disabled:hover:border-cyan-400/30',
                      'transition-all duration-200',
                      'text-sm font-medium',
                      'shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    )}
                  >
                    <Send size={16} />
                    Send
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
