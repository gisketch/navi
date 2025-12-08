import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

export type NaviState = 'offline' | 'idle' | 'listening' | 'thinking' | 'speaking';

// Radial menu state for Navi positioning
export interface RadialMenuState {
  isOpen: boolean;
  selectedButtonId: string | null;
  selectedButtonPosition: { x: number; y: number } | null;
  mainButtonCenter: { x: number; y: number };
}

// Position presets for different app modes
export type NaviPosition = 'center' | 'top-left' | 'top-right';

interface NaviProps {
  state?: NaviState;
  audioLevel?: number; // 0-1, for mic input or output volume
  scale?: number; // Overall scale of Navi (default 1)
  radialMenuState?: RadialMenuState; // For positioning Navi above radial menu buttons
  spinTrigger?: number; // Increment to trigger a wing spin animation
  position?: NaviPosition; // Where Navi should be positioned
  onPositionChange?: (pos: { x: number; y: number }) => void; // Callback for position updates
}

// Color schemes for each state
const stateColors = {
  offline: {
    primary: '#ffffff',
    secondary: '#cccccc',
    glow: 'rgba(255,255,255,0.2)',
    glowOuter: 'rgba(255,255,255,0.1)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #f5f5f5 40%, #e8e8e8 70%, rgba(200,200,200,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
    ring: '#ffffff',
  },
  idle: {
    primary: '#00ffff',
    secondary: '#00aaff',
    glow: 'rgba(0,255,255,0.5)',
    glowOuter: 'rgba(0,170,255,0.3)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0ffff 25%, #00ffff 60%, rgba(0,170,255,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(34,211,238,0) 70%)',
    ring: '#00ffff',
  },
  listening: {
    primary: '#ffdd00',
    secondary: '#ffaa00',
    glow: 'rgba(255,221,0,0.5)',
    glowOuter: 'rgba(255,170,0,0.3)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #fffde0 25%, #ffdd00 60%, rgba(255,170,0,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(255,221,0,0.4) 0%, rgba(255,221,0,0) 70%)',
    ring: '#ffdd00',
  },
  thinking: {
    primary: '#00ff88',
    secondary: '#00cc66',
    glow: 'rgba(0,255,136,0.5)',
    glowOuter: 'rgba(0,204,102,0.3)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0fff0 25%, #00ff88 60%, rgba(0,204,102,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(0,255,136,0.4) 0%, rgba(0,255,136,0) 70%)',
    ring: '#00ff88',
  },
  speaking: {
    primary: '#00ffff',
    secondary: '#00aaff',
    glow: 'rgba(0,255,255,0.5)',
    glowOuter: 'rgba(0,170,255,0.3)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0ffff 25%, #00ffff 60%, rgba(0,170,255,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(34,211,238,0) 70%)',
    ring: '#00ffff',
  },
};

// Particle component for falling/orbiting particles
function Particle({ delay, state }: { delay: number; state: NaviState }) {
  const randomX = useMemo(() => (Math.random() - 0.5) * 100, []);
  const orbitAngle = useMemo(() => Math.random() * 360, []);

  if (state === 'thinking') {
    // Orbiting particles for thinking state (Electron-style 3D orbits)
    return (
      <motion.div
        className="absolute top-1/2 left-1/2 w-0 h-0"
        style={{ rotate: orbitAngle }} // Rotate the entire orbit plane
      >
        <motion.div
          className="absolute -top-1 -left-1 size-2 rounded-full bg-white pointer-events-none"
          style={{
            boxShadow: `0 0 6px 2px rgba(255,255,255,0.8), 0 0 12px 4px ${stateColors.thinking.glow}`,
          }}
          initial={{
            opacity: 0
          }}
          animate={{
            // Elliptical orbit path
            x: [60, 0, -60, 0, 60],
            y: [0, -15, 0, 15, 0],
            // Scale and Opacity to simulate 3D depth (passing behind/in front)
            scale: [1, 0.5, 1, 1.4, 1],
            opacity: [1, 0.5, 1, 1, 1],
            // Z-index switching to actually pass behind/in front of the body (body is z-20)
            zIndex: [25, 1, 25, 30, 25],
          }}
          exit={{
            opacity: 0
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: delay,
          }}
        />
      </motion.div>
    );
  }

  // Falling particles for other states
  return (
    <motion.div
      className="absolute size-2 rounded-full bg-white pointer-events-none"
      style={{
        boxShadow: `0 0 6px 2px rgba(255,255,255,0.8), 0 0 12px 4px ${stateColors[state].glow}`,
        left: "50%",
        top: "60%",
      }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, randomX * 0.5, randomX],
        y: [-30, 100],
        scale: [1, 0.7, 0],
      }}
      transition={{
        duration: state === 'listening' ? 1.5 : 2.5,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// Screen edge waveform visualizer for listening state
function ScreenEdgeWaveform({ audioLevel, isActive }: { audioLevel: number; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);
  const slideRef = useRef(0); // 0 = off-screen, 1 = fully visible (slides in from edges)
  const isActiveRef = useRef(isActive);
  const audioLevelRef = useRef(audioLevel);

  // Keep refs in sync with props
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      timeRef.current += 0.015;

      // Smoothly slide in/out based on isActive (using ref for current value)
      const slideSpeed = 0.025; // ~0.6 second transition
      if (isActiveRef.current) {
        slideRef.current = Math.min(1, slideRef.current + slideSpeed);
      } else {
        slideRef.current = Math.max(0, slideRef.current - slideSpeed);
      }

      // Smooth the audio level for less jittery animation
      smoothAudioRef.current += (audioLevelRef.current - smoothAudioRef.current) * 0.1;
      const smoothAudio = smoothAudioRef.current;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Only render when slide > 0
      if (slideRef.current <= 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Eased slide value for smooth acceleration/deceleration
      const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const slideEased = easeInOut(slideRef.current);

      // Calculate slide offset - glow slides in from outside screen
      const maxSlideOffset = 150; // How far off-screen when hidden
      const slideOffset = (1 - slideEased) * maxSlideOffset;

      const effectiveLevel = Math.max(0.05, smoothAudio);

      // Draw smooth glowing edge on left and right sides only
      const drawSideGlow = (isLeft: boolean) => {
        // Apply slide offset - left edge slides from left, right edge slides from right
        const baseX = isLeft ? 0 : width;
        const x = isLeft ? baseX - slideOffset : baseX + slideOffset;

        const baseWidth = 20 + effectiveLevel * 40;
        const numPoints = 8; // Few control points for smooth curves

        // Generate smooth control points using sine waves
        const points: { y: number; offset: number }[] = [];
        for (let i = 0; i <= numPoints; i++) {
          const t = i / numPoints;
          const y = t * height;

          // Smooth sine waves for gentle undulation
          const wave1 = Math.sin(t * Math.PI * 2 + timeRef.current * 0.8) * 0.5;
          const wave2 = Math.sin(t * Math.PI * 1.5 - timeRef.current * 0.5) * 0.3;
          const wave3 = Math.sin(t * Math.PI * 3 + timeRef.current * 1.2) * 0.2;

          const offset = (wave1 + wave2 + wave3) * baseWidth * effectiveLevel;
          points.push({ y, offset });
        }

        // Draw multiple layered glows for depth - apply slide opacity
        // CSS blur handles the blur effect (Safari compatible), so we just draw solid layers
        const slideOpacity = slideEased;
        const layers = [
          { alpha: 0.08 * slideOpacity, width: baseWidth * 2.0 },
          { alpha: 0.15 * slideOpacity, width: baseWidth * 1.2 },
          { alpha: 0.25 * slideOpacity, width: baseWidth * 0.6 },
          { alpha: 0.4 * slideOpacity, width: baseWidth * 0.25 },
        ];

        layers.forEach(layer => {
          ctx.beginPath();

          // Start from edge
          ctx.moveTo(x, 0);

          // Draw smooth bezier curve through points
          for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];

            const currX = x + (isLeft ? 1 : -1) * (layer.width + curr.offset);
            const nextX = x + (isLeft ? 1 : -1) * (layer.width + next.offset);

            const midY = (curr.y + next.y) / 2;
            const midX = (currX + nextX) / 2;

            if (i === 0) {
              ctx.lineTo(currX, curr.y);
            }
            ctx.quadraticCurveTo(currX, curr.y + (next.y - curr.y) * 0.5, midX, midY);
          }

          // Last point
          const last = points[points.length - 1];
          ctx.lineTo(x + (isLeft ? 1 : -1) * (layer.width + last.offset), last.y);

          // Close back to edge
          ctx.lineTo(x, height);
          ctx.lineTo(x, 0);
          ctx.closePath();

          // Gradient fill
          const gradient = ctx.createLinearGradient(
            x, 0,
            x + (isLeft ? 1 : -1) * layer.width * 2, 0
          );
          gradient.addColorStop(0, `rgba(120, 220, 255, ${layer.alpha * (0.5 + effectiveLevel)})`);
          gradient.addColorStop(0.3, `rgba(80, 180, 255, ${layer.alpha * 0.7 * (0.5 + effectiveLevel)})`);
          gradient.addColorStop(0.7, `rgba(40, 140, 220, ${layer.alpha * 0.3 * (0.5 + effectiveLevel)})`);
          gradient.addColorStop(1, 'rgba(0, 100, 180, 0)');

          ctx.fillStyle = gradient;
          ctx.fill();
        });
      };

      drawSideGlow(true);  // Left
      drawSideGlow(false); // Right

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [audioLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40 canvas-blur"
    />
  );
}

// Wing flap speed based on state
const getWingSpeed = (state: NaviState) => {
  switch (state) {
    case 'offline': return 0; // No flapping when offline
    case 'listening': return 0.12; // Fast buzzing
    case 'thinking': return 0.15; // Fast excited flapping
    case 'speaking': return 0.2; // Medium excited
    default: return 0.32; // Normal idle
  }
};

export function Navi({ state = 'offline', audioLevel = 0, scale = 1, radialMenuState, spinTrigger = 0, position = 'center', onPositionChange }: NaviProps) {
  const particles = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1];
  const flapSpeed = getWingSpeed(state);

  // Track if we've connected (transitioned from offline)
  const [hasConnected, setHasConnected] = useState(false);
  const [wingScale, setWingScale] = useState(state !== 'offline' ? 1 : 0); // Start based on initial state
  const [wingSpinRotation, setWingSpinRotation] = useState(0); // For triggered spins
  const prevStateRef = useRef<NaviState>(state);
  const prevSpinTriggerRef = useRef(spinTrigger);

  // Calculate position-based offset
  const getPositionOffset = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.2; // Default center Y

    if (position === 'top-left') {
      return {
        x: -centerX + 60,
        y: -centerY + 100,
      };
    }
    if (position === 'top-right') {
      return {
        x: centerX - 100, // 80px from right edge
        y: -centerY + 12, // 120px from top
      };
    }
    return { x: 0, y: 0 }; // Center position
  }, [position]);

  // Detect spin trigger changes
  useEffect(() => {
    if (spinTrigger !== prevSpinTriggerRef.current && spinTrigger > 0) {
      // Trigger a 360 spin
      setWingSpinRotation(prev => prev + 360);
    }
    prevSpinTriggerRef.current = spinTrigger;
  }, [spinTrigger]);

  // Detect transition from offline to connected states
  useEffect(() => {
    const wasOffline = prevStateRef.current === 'offline';
    const isNowOnline = state !== 'offline';

    if (wasOffline && isNowOnline) {
      // Transitioning from offline to online - trigger wing reveal
      setHasConnected(true);
      // Animate wing scale from 0 to 1
      setWingScale(1);
    } else if (state === 'offline') {
      // Going offline - reset
      setHasConnected(false);
      setWingScale(0);
    }

    prevStateRef.current = state;
  }, [state]);

  // Container ref for touch/mouse tracking
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for the main body position (idle animation)
  const idleX = useMotionValue(0);
  const idleY = useMotionValue(0);

  // Touch/mouse target position
  const touchTargetX = useMotionValue(0);
  const touchTargetY = useMotionValue(0);
  const [isTouching, setIsTouching] = useState(false);

  // Combined body position (idle + touch offset)
  const bodyX = useSpring(touchTargetX, { stiffness: 150, damping: 20 });
  const bodyY = useSpring(touchTargetY, { stiffness: 150, damping: 20 });

  // Report position changes to parent (for glow effects on nearby elements)
  // Throttled to prevent excessive re-renders
  const lastReportedPos = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onPositionChange) return;

    const reportPosition = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.2;
      const newX = centerX + bodyX.get();
      const newY = centerY + bodyY.get();

      // Only report if position changed significantly (> 5px)
      const dx = Math.abs(newX - lastReportedPos.current.x);
      const dy = Math.abs(newY - lastReportedPos.current.y);

      if (dx > 5 || dy > 5) {
        lastReportedPos.current = { x: newX, y: newY };
        onPositionChange({ x: newX, y: newY });
      }
    };

    // Throttled update - only report every 50ms max
    const unsubX = bodyX.on('change', () => {
      if (throttleRef.current) return;
      throttleRef.current = window.setTimeout(() => {
        throttleRef.current = null;
        reportPosition();
      }, 50);
    });
    const unsubY = bodyY.on('change', () => {
      if (throttleRef.current) return;
      throttleRef.current = window.setTimeout(() => {
        throttleRef.current = null;
        reportPosition();
      }, 50);
    });

    // Initial position report
    reportPosition();

    return () => {
      unsubX();
      unsubY();
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [bodyX, bodyY, onPositionChange]);

  // Springs that follow the body with dampening/drag effect (for glows)
  const glowX = useSpring(bodyX, { stiffness: 1000, damping: 20 });
  const glowY = useSpring(bodyY, { stiffness: 1000, damping: 20 });

  // Wings follow body with very short lag - higher stiffness = faster follow, higher damping = less bounce
  const wingRawX = useSpring(bodyX, { stiffness: 1000, damping: 50 });
  const wingRawY = useSpring(bodyY, { stiffness: 1000, damping: 50 });

  // Wing offset is the DIFFERENCE between wing position and body position (the lag)
  // This creates a drag effect without doubling up the movement
  const wingLagX = useTransform(() => wingRawX.get() - bodyX.get());
  const wingLagY = useTransform(() => wingRawY.get() - bodyY.get());

  // Glow lag - the difference between glow position and body position
  const glowLagX = useTransform(() => glowX.get() - bodyX.get());
  const glowLagY = useTransform(() => glowY.get() - bodyY.get());

  // Handle touch/mouse interactions - pressing anywhere triggers follow
  useEffect(() => {
    const handleStart = (clientX: number, clientY: number) => {
      // Don't allow following when offline
      if (state === 'offline') return;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.2; // Navi's default position

      const offsetX = clientX - centerX;
      const offsetY = clientY - centerY - 150; // Offset up so finger doesn't cover Navi

      touchTargetX.set(offsetX);
      touchTargetY.set(offsetY);
      setIsTouching(true);
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isTouching) return;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.2;

      const offsetX = clientX - centerX;
      const offsetY = clientY - centerY - 150; // Same offset as handleStart

      touchTargetX.set(offsetX);
      touchTargetY.set(offsetY);
    };

    const handleEnd = () => {
      setIsTouching(false);
      // Smoothly return to idle position
      touchTargetX.set(idleX.get());
      touchTargetY.set(idleY.get());
    };

    // Check if the event target is in a "safe" area (not header or control bar)
    const isInInteractiveArea = (target: EventTarget | null) => {
      if (!target || !(target instanceof Element)) return false;
      // Check if target is inside header, control bar, button, input, modal, or draggable chat bubbles
      // Note: [data-chat-bubble] is draggable for scrolling, [data-result-cards] is draggable for dismiss
      const excluded = target.closest('header, [data-control-bar], button, input, textarea, [role="dialog"], a, [data-interactive], [data-chat-bubble], [data-result-cards]');
      return !excluded;
    };

    // Touch events - don't prevent default on start to allow button taps
    const onTouchStart = (e: TouchEvent) => {
      // Only handle if not on interactive element
      if (isInInteractiveArea(e.target)) {
        // Small delay to allow button tap to register first
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isTouching) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleEnd();

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      if (isInInteractiveArea(e.target)) {
        handleStart(e.clientX, e.clientY);
      }
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [state, isTouching, touchTargetX, touchTargetY, idleX, idleY]);

  // Track radial menu override position
  const [radialOverride, setRadialOverride] = useState<{ x: number; y: number } | null>(null);
  const [radialScale, setRadialScale] = useState(1);
  const isRadialMenuOpen = radialMenuState?.isOpen ?? false;

  // Configurable offset above main button when radial menu is open (no selection)
  const RADIAL_DEFAULT_OFFSET_Y = -120; // pixels above main button

  // Position Navi above selected radial menu button
  useEffect(() => {
    if (!radialMenuState?.isOpen) {
      // Menu closed - clear override
      setRadialOverride(null);
      setRadialScale(1);
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.2; // Navi's default center

    if (radialMenuState.selectedButtonPosition) {
      // Has selection - position above the selected button
      const targetX = radialMenuState.selectedButtonPosition.x - centerX;
      const targetY = radialMenuState.selectedButtonPosition.y - centerY - 80; // 80px above the button

      setRadialOverride({ x: targetX, y: targetY });
      setRadialScale(0.6);
    } else {
      // Menu open but no selection - position above main button
      const targetX = radialMenuState.mainButtonCenter.x - centerX;
      const targetY = radialMenuState.mainButtonCenter.y - centerY + RADIAL_DEFAULT_OFFSET_Y;

      setRadialOverride({ x: targetX, y: targetY });
      setRadialScale(0.6);
    }
  }, [radialMenuState]);

  // Update touch target when radial override changes
  useEffect(() => {
    if (radialOverride) {
      touchTargetX.set(radialOverride.x);
      touchTargetY.set(radialOverride.y);
    }
  }, [radialOverride, touchTargetX, touchTargetY]);

  // Animated scale for radial menu transitions
  const animatedScale = useSpring(radialScale, { stiffness: 300, damping: 25 });

  useEffect(() => {
    animatedScale.set(radialScale);
  }, [radialScale, animatedScale]);

  // Animate idle position based on state (when not touching AND radial menu is closed)
  useEffect(() => {
    // Skip idle animation when radial menu is open
    if (isRadialMenuOpen) return;

    let animationFrame: number;
    let startTime = Date.now();

    const animate = () => {
      // Double check radial menu isn't open (in case state changed mid-animation)
      if (isRadialMenuOpen) {
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const posOffset = getPositionOffset();

      let newX = posOffset.x;
      let newY = posOffset.y;

      if (state === 'offline') {
        // Very subtle floating when offline
        const t = (elapsed % 4) / 4 * Math.PI * 2;
        newX += 0;
        newY += Math.sin(t) * -3;
      } else if (state === 'idle') {
        // Figure-8 movement
        const t = (elapsed % 3) / 3 * Math.PI * 2;
        newX += Math.sin(t) * 12;
        newY += Math.sin(t * 2) * -8;
      } else if (state === 'listening') {
        // Gentle bobbing
        const t = (elapsed % 0.5) / 0.5 * Math.PI * 2;
        newX += 0;
        newY += Math.sin(t) * -5;
      } else if (state === 'thinking') {
        // Excited bobbing and slight wandering
        const t = (elapsed % 0.6) / 0.6 * Math.PI * 2;
        const wanderT = (elapsed % 2) / 2 * Math.PI * 2;
        newX += Math.sin(wanderT) * 8;
        newY += Math.sin(t) * -6 + Math.cos(wanderT * 0.5) * 4;
      } else if (state === 'speaking') {
        // Gentle floating
        const t = (elapsed % 1.5) / 1.5 * Math.PI * 2;
        newX += 0;
        newY += Math.sin(t) * -6;
      }

      idleX.set(newX);
      idleY.set(newY);

      // Only update touch target if not currently touching
      if (!isTouching) {
        touchTargetX.set(newX);
        touchTargetY.set(newY);
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [state, idleX, idleY, touchTargetX, touchTargetY, isTouching, isRadialMenuOpen, getPositionOffset, position]);

  // Dynamic wing speed - faster when touching/moving
  const effectiveFlapSpeed = isTouching ? Math.max(0.08, flapSpeed * 0.5) : flapSpeed;

  // Body scale based on audio level
  const bodyScale = (state === 'listening' || state === 'speaking')
    ? 1 + audioLevel * 0.15
    : 1;

  // Glow intensity based on state (offline is very low)
  const glowIntensity = state === 'offline'
    ? 0.00
    : state === 'listening' || state === 'speaking'
      ? 0.1 + audioLevel * 0.25
      : 0.1;

  return (
    <>
      {/* Screen edge waveform for listening state */}
      <ScreenEdgeWaveform audioLevel={audioLevel} isActive={state === 'listening'} />

      <div
        ref={containerRef}
        className="fixed inset-0 flex items-start justify-center cursor-pointer select-none pointer-events-none z-[60] pt-56"
        style={{ touchAction: 'none' }}
      >
        {/* Scaled container for all visual elements - combines prop scale with radial menu scale */}
        <motion.div style={{ scale: useTransform(animatedScale, s => scale * s) }}>
          {/* Main Navi container */}
          <motion.div
            className="relative z-10"
            style={{ x: bodyX, y: bodyY }}
            animate={{ scale: isTouching ? 1.15 : (state === 'listening' ? 1.1 : 1) }}
            transition={{ scale: { duration: 0.3 } }}
          >
            {/* Big gradient circle glow - follows body with drag (reduced opacity) */}
            {Object.entries(stateColors).map(([colorState, colorValues]) => (
              <motion.div
                key={`outer-glow-${colorState}`}
                className="absolute z-0 size-40 rounded-full blur-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  background: colorValues.outerGradient,
                  x: glowLagX,
                  y: glowLagY,
                }}
                animate={{
                  scale: state === 'thinking' ? [1, 1.2, 1] : [1, 1.1, 1],
                  opacity: state === colorState
                    ? [0.2 + glowIntensity, 0.3 + glowIntensity, 0.2 + glowIntensity]
                    : 0,
                }}
                transition={{
                  scale: { duration: state === 'thinking' ? 0.5 : 2, repeat: Infinity, ease: "easeInOut" },
                  opacity: state === colorState
                    ? { duration: state === 'thinking' ? 0.5 : 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.8, ease: "easeInOut" },
                }}
              />
            ))}

            {/* Simple circle glow on top - follows body with drag (reduced opacity) */}
            {Object.entries(stateColors).map(([colorState, colorValues]) => (
              <motion.div
                key={`inner-glow-${colorState}`}
                className="absolute z-0 size-20 rounded-full blur-md left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  backgroundColor: colorValues.primary,
                  x: glowLagX,
                  y: glowLagY,
                }}
                animate={{
                  opacity: state === colorState ? glowIntensity + 0.1 : 0
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            ))}

            {/* Particles - only show when not offline */}
            {state !== 'offline' && particles.map((delay, index) => (
              <Particle key={`${state}-${index}`} delay={delay} state={state} />
            ))}

            <div className="flex flex-row items-center justify-center">
              {/* Left wings - with drag/lag effect and reveal animation */}
              <motion.div
                className="flex flex-col items-end -mr-4 origin-right"
                style={{ x: wingLagX, y: wingLagY }}
                initial={{ scale: 0, rotate: 0 }}
                animate={{
                  scale: wingScale,
                  rotate: wingScale === 1 ? (hasConnected ? 360 : 0) + wingSpinRotation : 0,
                }}
                transition={{
                  scale: { duration: 0.6, ease: "easeOut" },
                  rotate: { duration: 0.5, ease: "easeOut" },
                }}
              >
                <motion.img
                  key={`wing-lt-${effectiveFlapSpeed}-${wingScale}`}
                  className="size-16 origin-right"
                  src='wingtop.png'
                  id="wing-left-top"
                  animate={wingScale === 1 && state !== 'offline' ? { scaleX: [1, 0.4, 1], scaleY: [0.8, 1, 0.8] } : {}}
                  transition={{ duration: effectiveFlapSpeed || 0.32, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.img
                  key={`wing-lb-${effectiveFlapSpeed}-${wingScale}`}
                  className="size-8 origin-right"
                  src='wingbot.png'
                  id="wing-left-bot"
                  animate={wingScale === 1 && state !== 'offline' ? { scaleX: [1, 0.4, 1] } : {}}
                  transition={{ duration: effectiveFlapSpeed || 0.32, repeat: Infinity, ease: "easeIn", delay: 0.05 }}
                />
              </motion.div>

              <div id="navi-body-center" className="relative mt-6 z-20">
                {/* Outer glow circle - layered for color transitions (reduced opacity) */}
                {Object.entries(stateColors).map(([colorState, colorValues]) => (
                  <motion.div
                    key={`body-outer-${colorState}`}
                    className="absolute inset-0 size-16 -translate-x-2 -translate-y-2 rounded-full blur-sm"
                    style={{ background: colorValues.gradient }}
                    animate={{ opacity: state === colorState ? glowIntensity * 0.8 : 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />
                ))}
                {/* Main body sphere - layered for color transitions */}
                <div className="relative size-12">
                  {/* White base body - prevents transparent gaps during color transitions */}
                  <div
                    className="absolute inset-0 size-12 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)',
                      boxShadow: '0 0 10px 3px rgba(255,255,255,0.5)',
                    }}
                  />
                  {/* Colored body layers */}
                  {Object.entries(stateColors).map(([colorState, colorValues]) => {
                    const isActive = state === colorState;

                    return (
                      <motion.div
                        key={`body-main-${colorState}`}
                        className="absolute inset-0 size-12 rounded-full"
                        style={{
                          background: colorValues.gradient,
                          boxShadow: `0 0 15px 5px ${colorValues.glow}, 0 0 30px 10px ${colorValues.glowOuter}`,
                        }}
                        animate={{
                          opacity: isActive ? 1 : 0,
                          scale: isActive
                            ? (state === 'offline'
                              ? [1, 1.03, 1]  // Very subtle pulse for offline
                              : state === 'thinking'
                                ? [1, 1.15, 1]
                                : state === 'idle'
                                  ? [1, 1.08, 1]
                                  : bodyScale)
                            : 1,
                        }}
                        transition={{
                          opacity: { duration: 0.8, ease: "easeInOut" },
                          scale: state === 'offline'
                            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                            : state === 'thinking'
                              ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
                              : state === 'idle'
                                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                                : { duration: 0.1 },
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Right wings - with drag/lag effect and reveal animation */}
              <motion.div
                className="flex flex-col -ml-4 origin-left"
                style={{ x: wingLagX, y: wingLagY }}
                initial={{ scale: 0, rotate: 0 }}
                animate={{
                  scale: wingScale,
                  rotate: wingScale === 1 ? (hasConnected ? -360 : 0) - wingSpinRotation : 0,
                }}
                transition={{
                  scale: { duration: 0.6, ease: "easeOut", delay: 0.1 },
                  rotate: { duration: 0.5, ease: "easeOut", delay: 0.1 },
                }}
              >
                <motion.img
                  key={`wing-rt-${effectiveFlapSpeed}-${wingScale}`}
                  className="size-16 origin-right -translate-x-full"
                  src='wingtop.png'
                  id="wing-right-top"
                  style={{ scaleX: -1 }}
                  animate={wingScale === 1 && state !== 'offline' ? { scaleX: [-1, -0.4, -1], scaleY: [0.8, 1, 0.8] } : { scaleX: -1 }}
                  transition={{ duration: effectiveFlapSpeed || 0.32, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.img
                  key={`wing-rb-${effectiveFlapSpeed}-${wingScale}`}
                  className="size-8 origin-right -translate-x-full"
                  src='wingbot.png'
                  id="wing-right-bot"
                  style={{ scaleX: -1 }}
                  animate={wingScale === 1 && state !== 'offline' ? { scaleX: [-1, -0.4, -1] } : { scaleX: -1 }}
                  transition={{ duration: effectiveFlapSpeed || 0.32, repeat: Infinity, ease: "easeIn", delay: 0.05 }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
