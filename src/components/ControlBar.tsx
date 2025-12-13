import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Keyboard, Settings, Radio, Fingerprint, Sparkles, FileText, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MicMode } from '../utils/constants';
import type { ConnectionStatus } from '../hooks/useGeminiLive';
import type { NaviState } from './Navi';
import { KeyboardInputModal } from './KeyboardInputModal';

// Export radial menu info for Navi positioning
export interface RadialMenuState {
  isOpen: boolean;
  selectedButtonId: string | null;
  selectedButtonPosition: { x: number; y: number } | null;
  mainButtonCenter: { x: number; y: number };
}

interface ControlBarProps {
  state: NaviState;
  micMode: MicMode;
  connectionStatus: ConnectionStatus;
  isCapturing: boolean;
  isPlaying: boolean;
  onStartCapture: () => void | Promise<void>;
  onStopCapture: () => void;
  onSendText: (text: string) => void;
  onStopPlayback: () => void;
  onOpenSettings: () => void;
  onConnect: () => void | Promise<void>;
  onDisconnect?: () => void;
  onRadialMenuChange?: (state: RadialMenuState) => void;
  isOnline: boolean;
}

// Radial menu button positions (angle in degrees, 0 = right, counter-clockwise)
export const RADIAL_BUTTONS = [
  { id: 'keyboard', icon: Keyboard, angle: 180, requiresConnection: true },
  { id: 'settings', icon: Settings, angle: 135, requiresConnection: false },
  { id: 'logs', icon: FileText, angle: 45, requiresConnection: false },
  { id: 'disconnect', icon: LogOut, angle: 0, requiresConnection: true },
];

export const RADIAL_RADIUS = 100; // Distance from center
const HOLD_THRESHOLD = 150; // ms to trigger radial menu (1 second)
const SELECTION_RADIUS = 40; // How close finger needs to be to select

export function ControlBar({
  state,
  micMode,
  connectionStatus,
  isCapturing,
  isPlaying,
  onStartCapture,
  onStopCapture,
  onSendText,
  onStopPlayback,
  onOpenSettings,
  onConnect,
  onDisconnect,
  onRadialMenuChange,
  isOnline,
}: ControlBarProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [fingerOffset, setFingerOffset] = useState({ x: 0, y: 0 });
  const [hasEntered, setHasEntered] = useState(false); // Track if entrance animation is done
  const [isHolding, setIsHolding] = useState(false); // Track if user is holding (for event listeners)

  const isConnected = connectionStatus === 'connected';
  const isHoldingRef = useRef(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const buttonCenterRef = useRef({ x: 0, y: 0 });
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const hasMovedRef = useRef(false);
  const radialTriggeredRef = useRef(false);

  // Clear hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // Reset hasEntered when menu closes
  useEffect(() => {
    if (!showRadialMenu) {
      setHasEntered(false);
    }
  }, [showRadialMenu]);

  // Notify parent of radial menu state changes
  useEffect(() => {
    if (!onRadialMenuChange) return;

    let selectedButtonPosition: { x: number; y: number } | null = null;

    if (selectedButton && showRadialMenu) {
      const btn = RADIAL_BUTTONS.find(b => b.id === selectedButton);
      if (btn) {
        const angleRad = (btn.angle * Math.PI) / 180;
        selectedButtonPosition = {
          x: buttonCenterRef.current.x + Math.cos(angleRad) * RADIAL_RADIUS,
          y: buttonCenterRef.current.y - Math.sin(angleRad) * RADIAL_RADIUS,
        };
      }
    }

    onRadialMenuChange({
      isOpen: showRadialMenu,
      selectedButtonId: selectedButton,
      selectedButtonPosition,
      mainButtonCenter: buttonCenterRef.current,
    });
  }, [showRadialMenu, selectedButton, onRadialMenuChange]);

  // Toggle keyboard mode
  const toggleKeyboard = useCallback(() => {
    setShowKeyboard(prev => !prev);
  }, []);

  const handleSendText = useCallback((text: string) => {
    if (text.trim() && isConnected) {
      onSendText(text.trim());
    }
  }, [isConnected, onSendText]);

  // Calculate which radial button is closest to finger position
  const getClosestButton = useCallback((fingerX: number, fingerY: number) => {
    const centerX = buttonCenterRef.current.x;
    const centerY = buttonCenterRef.current.y;

    let closestId: string | null = null;
    let closestDist = Infinity;

    // Check distance from center first - if too close, no selection
    const distFromCenter = Math.sqrt((fingerX - centerX) ** 2 + (fingerY - centerY) ** 2);
    if (distFromCenter < 50) return null; // Must move away from center to select

    RADIAL_BUTTONS.forEach(btn => {
      const angleRad = (btn.angle * Math.PI) / 180;
      const btnX = centerX + Math.cos(angleRad) * RADIAL_RADIUS;
      const btnY = centerY - Math.sin(angleRad) * RADIAL_RADIUS;

      const dist = Math.sqrt((fingerX - btnX) ** 2 + (fingerY - btnY) ** 2);
      if (dist < SELECTION_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestId = btn.id;
      }
    });

    return closestId;
  }, []);

  // Execute the selected radial button action
  const executeRadialAction = useCallback((buttonId: string | null) => {
    switch (buttonId) {
      case 'keyboard':
        if (isConnected) toggleKeyboard();
        break;
      case 'settings':
        onOpenSettings();
        break;
      case 'logs':
        // TODO: Implement logs
        console.log('Logs clicked');
        break;
      case 'disconnect':
        if (isConnected) onDisconnect?.();
        break;
      default:
        // No selection or main button area - do nothing extra
        break;
    }
  }, [isConnected, toggleKeyboard, onOpenSettings, onDisconnect]);

  // --- Main Button Hold/Tap Logic ---
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    // Store start position and button center
    startPosRef.current = { x: clientX, y: clientY };
    hasMovedRef.current = false;
    radialTriggeredRef.current = false;
    setIsHolding(true); // Start tracking hold for event listeners

    if (mainButtonRef.current) {
      const rect = mainButtonRef.current.getBoundingClientRect();
      buttonCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    // Start hold timer for radial menu (always available)
    holdTimerRef.current = setTimeout(() => {
      radialTriggeredRef.current = true;
      setShowRadialMenu(true);
      setSelectedButton(null);
      setFingerOffset({ x: 0, y: 0 });
      // Mark entrance as done after stagger animation completes
      setTimeout(() => setHasEntered(true), RADIAL_BUTTONS.length * 50 + 200);
    }, HOLD_THRESHOLD);

    // Handle push-to-talk when mic mode is manual
    if (isConnected && micMode === 'manual') {
      isHoldingRef.current = true;
      if (isPlaying) onStopPlayback();
      onStartCapture();
    }
  }, [isConnected, micMode, isPlaying, onStopPlayback, onStartCapture]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!showRadialMenu && !holdTimerRef.current) return;

    // Check if moved enough to cancel tap
    const dx = clientX - startPosRef.current.x;
    const dy = clientY - startPosRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      hasMovedRef.current = true;
    }

    if (showRadialMenu) {
      // Update selected button based on finger position
      const closest = getClosestButton(clientX, clientY);
      setSelectedButton(closest);

      // Calculate parallax offset (subtle movement of buttons following finger)
      const offsetX = (clientX - buttonCenterRef.current.x) * 0.1;
      const offsetY = (clientY - buttonCenterRef.current.y) * 0.1;
      setFingerOffset({ x: Math.max(-15, Math.min(15, offsetX)), y: Math.max(-15, Math.min(15, offsetY)) });
    }
  }, [showRadialMenu, getClosestButton]);

  const handlePointerUp = useCallback(() => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    setIsHolding(false); // Stop tracking hold

    // Handle push-to-talk release when mic mode is manual
    if (micMode === 'manual' && isHoldingRef.current) {
      isHoldingRef.current = false;
      onStopCapture();
    }

    // If radial menu was shown, execute selected action
    if (showRadialMenu) {
      executeRadialAction(selectedButton);
      setShowRadialMenu(false);
      setSelectedButton(null);
      setFingerOffset({ x: 0, y: 0 });
      return;
    }

    // If it was a quick tap (no radial triggered), handle normal click
    if (!radialTriggeredRef.current && !hasMovedRef.current) {
      // Normal tap behavior is handled by onClick
    }
  }, [micMode, onStopCapture, showRadialMenu, selectedButton, executeRadialAction]);

  const handleMainButtonMouseDown = useCallback((e: React.MouseEvent) => {
    handlePointerDown(e.clientX, e.clientY);
  }, [handlePointerDown]);

  const handleMainButtonTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't preventDefault here - it causes passive listener warning
    // The touch behavior is handled by the pointer events
    const touch = e.touches[0];
    handlePointerDown(touch.clientX, touch.clientY);
  }, [handlePointerDown]);

  // Global move/up handlers when holding or radial is active
  useEffect(() => {
    if (!showRadialMenu && !isHolding) return;

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent page scrolling
      if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onMouseUp = () => handlePointerUp();
    const onTouchEnd = () => handlePointerUp();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [showRadialMenu, isHolding, handlePointerMove, handlePointerUp]);

  const handleMainButtonClick = useCallback(async () => {
    // If radial was triggered, don't do normal click
    if (radialTriggeredRef.current) return;

    if (!isOnline) return;

    if (!isConnected) {
      if (connectionStatus !== 'connecting') onConnect();
      return;
    }
    if (micMode === 'auto') {
      if (isPlaying && !isCapturing) onStopPlayback();
      if (isCapturing) {
        onStopCapture();
      } else {
        await onStartCapture();
      }
    }
  }, [isConnected, connectionStatus, onConnect, micMode, isPlaying, isCapturing, onStopPlayback, onStopCapture, onStartCapture, isOnline]);

  // Determine current icon state based on NaviState + Connection override
  const getIconState = () => {
    if (!isOnline) return 'offline';
    if (connectionStatus === 'connecting') return 'connecting';
    return state; // 'offline' | 'idle' | 'listening' | 'speaking' | 'thinking'
  };

  const iconState = getIconState();

  // Animation variants
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5, rotate: -180 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.5, rotate: 180 }
  };

  return (
    <div
      /* className="relative w-full flex flex-col items-center justify-end pb-16 pt-4 px-6 z-50" */
      className="z-40 px-6 pt-8 touch-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
      data-control-bar>

      {/* Keyboard Input Modal - Page stays fixed, modal overlays */}
      <AnimatePresence>
        {showKeyboard && (
          <KeyboardInputModal
            key="keyboard-input-modal"
            isOpen={true}
            onClose={() => setShowKeyboard(false)}
            onSend={handleSendText}
            isConnected={isConnected}
          />
        )}
      </AnimatePresence>

      {/* Control Buttons Container - Always visible */}
      <div className="flex items-center justify-center glass-button-vars">

        {/* Center: Main Action Button with Radial Menu */}
        <div className="relative group">
          {/* Radial Menu Buttons */}
          <AnimatePresence>
            {showRadialMenu && (
              <>
                {RADIAL_BUTTONS.map((btn, index) => {
                  const angleRad = (btn.angle * Math.PI) / 180;
                  // Only apply parallax after entrance animation is done
                  const parallaxX = hasEntered ? fingerOffset.x : 0;
                  const parallaxY = hasEntered ? fingerOffset.y : 0;
                  const x = Math.cos(angleRad) * RADIAL_RADIUS + parallaxX;
                  const y = -Math.sin(angleRad) * RADIAL_RADIUS + parallaxY;
                  const isSelected = selectedButton === btn.id;
                  const isDisabled = btn.requiresConnection && !isConnected;
                  const Icon = btn.icon;

                  return (
                    <motion.div
                      key={btn.id}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: isDisabled ? 0.4 : 1,
                        scale: 1,
                        x,
                        y,
                      }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={hasEntered ? {
                        type: 'spring',
                        stiffness: 600,
                        damping: 30,
                      } : {
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                        delay: index * 0.05,
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
                    >
                      {/* Radial button - matches BottomNavBar main button style */}
                      <div
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-150 ${isSelected && !isDisabled
                          ? 'bg-white/[0.08] border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.08] border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]'
                          }`}
                      >
                        {/* Inner highlight - same as BottomNavBar */}
                        <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        <Icon className={`w-6 h-6 relative ${isSelected && !isDisabled ? 'text-cyan-400' : 'text-white/70'}`} />
                      </div>
                    </motion.div>
                  );
                })}
                {/* Dim overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/30 -z-10"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Active Glow - subtle cyan for listening, speaking */}
          <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${iconState === 'listening' || iconState === 'speaking' ? 'bg-cyan-400/30 opacity-100 scale-150' : 'opacity-0'
            }`} />

          <button
            ref={mainButtonRef}
            onMouseDown={handleMainButtonMouseDown}
            onTouchStart={handleMainButtonTouchStart}
            onClick={handleMainButtonClick}
            disabled={connectionStatus === 'connecting' || !isOnline}
            className={`relative flex items-center justify-center w-[72px] h-[72px] rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70 ${showRadialMenu
              ? 'bg-white/[0.08] border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-95'
              : iconState === 'listening' || iconState === 'speaking'
                ? 'bg-white/[0.08] text-white border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'bg-white/[0.08] text-white border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]'
              }`}
          >
            {/* Inner highlight - same as BottomNavBar */}
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <AnimatePresence mode="popLayout">
              {iconState === 'connecting' && (
                <motion.div
                  key="connecting"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-8 h-8 rounded-full border-t-2 border-white/50 animate-spin" />
                </motion.div>
              )}
              {iconState === 'offline' && (
                <motion.div
                  key="offline"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Radio className="w-8 h-8 text-gray-500" />
                </motion.div>
              )}
              {/* Listening State: White Glow */}
              {iconState === 'listening' && (
                <motion.div
                  key="listening"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="absolute inset-0 rounded-full animate-ping bg-white/20 opacity-75" />
                  <Mic className="w-8 h-8 relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                </motion.div>
              )}
              {/* Speaking State: Sparkles */}
              {iconState === 'speaking' && (
                <motion.div
                  key="speaking"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                </motion.div>
              )}
              {(iconState === 'idle' || iconState === 'thinking') && (
                <motion.div
                  key="idle"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Fingerprint className="w-8 h-8 opacity-80" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

      </div>
    </div>
  );
}
