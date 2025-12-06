import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo, useState, useRef } from 'react';

export type NaviState = 'offline' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface NaviProps {
  state?: NaviState;
  audioLevel?: number; // 0-1, for mic input or output volume
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
    // Orbiting particles for thinking state
    return (
      <motion.div
        className="absolute size-2 rounded-full bg-white pointer-events-none"
        style={{
          boxShadow: `0 0 6px 2px rgba(255,255,255,0.8), 0 0 12px 4px ${stateColors.thinking.glow}`,
          left: "50%",
          top: "50%",
        }}
        animate={{
          rotate: [orbitAngle, orbitAngle + 360],
          x: [0, 0],
          y: [-35, -35],
        }}
        transition={{
          rotate: { duration: 1.5, repeat: Infinity, ease: "linear", delay: delay * 0.3 },
        }}
      />
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

// Wing flap speed based on state
const getWingSpeed = (state: NaviState) => {
  switch (state) {
    case 'offline': return 0; // No flapping when offline
    case 'listening': return 0.12; // Fast buzzing
    case 'thinking': return 0.5; // Slow, calm
    case 'speaking': return 0.2; // Medium excited
    default: return 0.32; // Normal idle
  }
};

export function Navi({ state = 'offline', audioLevel = 0 }: NaviProps) {
  const particles = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1];
  const colors = stateColors[state];
  const flapSpeed = getWingSpeed(state);

  // Track if we've connected (transitioned from offline)
  const [hasConnected, setHasConnected] = useState(false);
  const [wingScale, setWingScale] = useState(0); // Start at 0 when offline
  const prevStateRef = useRef<NaviState>(state);

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

  // Springs that follow the body with dampening/drag effect (for glows)
  const glowX = useSpring(bodyX, { stiffness: 300, damping: 20 });
  const glowY = useSpring(bodyY, { stiffness: 300, damping: 20 });

  // Wings follow body with very short lag - higher stiffness = faster follow, higher damping = less bounce
  const wingRawX = useSpring(bodyX, { stiffness: 1000, damping: 50 });
  const wingRawY = useSpring(bodyY, { stiffness: 1000, damping: 50 });

  // Wing offset is the DIFFERENCE between wing position and body position (the lag)
  // This creates a drag effect without doubling up the movement
  const wingLagX = useTransform(() => wingRawX.get() - bodyX.get());
  const wingLagY = useTransform(() => wingRawY.get() - bodyY.get());

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
      // Check if target is inside header, control bar, button, input, or modal
      const excluded = target.closest('header, [data-control-bar], button, input, textarea, [role="dialog"], a');
      return !excluded;
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      if (isInInteractiveArea(e.target)) {
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

  // Animate idle position based on state (when not touching)
  useEffect(() => {
    let animationFrame: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      let newX = 0;
      let newY = 0;

      if (state === 'offline') {
        // Very subtle floating when offline
        const t = (elapsed % 4) / 4 * Math.PI * 2;
        newX = 0;
        newY = Math.sin(t) * -3;
      } else if (state === 'idle') {
        // Figure-8 movement
        const t = (elapsed % 3) / 3 * Math.PI * 2;
        newX = Math.sin(t) * 12;
        newY = Math.sin(t * 2) * -8;
      } else if (state === 'listening') {
        // Gentle bobbing
        const t = (elapsed % 0.5) / 0.5 * Math.PI * 2;
        newX = 0;
        newY = Math.sin(t) * -5;
      } else if (state === 'speaking') {
        // Gentle floating
        const t = (elapsed % 1.5) / 1.5 * Math.PI * 2;
        newX = 0;
        newY = Math.sin(t) * -6;
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
  }, [state, idleX, idleY, touchTargetX, touchTargetY, isTouching]);

  // Dynamic wing speed - faster when touching/moving
  const effectiveFlapSpeed = isTouching ? Math.max(0.08, flapSpeed * 0.5) : flapSpeed;

  // Body scale based on audio level
  const bodyScale = (state === 'listening' || state === 'speaking')
    ? 1 + audioLevel * 0.15
    : 1;

  // Glow intensity based on state (offline is very low)
  const glowIntensity = state === 'offline'
    ? 0.05
    : state === 'listening' || state === 'speaking'
      ? 0.1 + audioLevel * 0.25
      : 0.1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-start justify-center cursor-pointer select-none pointer-events-none z-50 pt-[20vh]"
      style={{ touchAction: 'none' }}
    >
      {/* Big gradient circle glow - follows body with drag (reduced opacity) */}
      {Object.entries(stateColors).map(([colorState, colorValues]) => (
        <motion.div
          key={`outer-glow-${colorState}`}
          className="absolute z-0 size-40 rounded-full blur-xl"
          style={{
            background: colorValues.outerGradient,
            x: glowX,
            y: glowY,
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
          className="absolute z-0 size-20 rounded-full blur-md"
          style={{
            backgroundColor: colorValues.primary,
            x: glowX,
            y: glowY,
          }}
          animate={{
            opacity: state === colorState ? glowIntensity + 0.1 : 0
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      ))}

      {/* Main Navi container */}
      <motion.div
        className="relative z-10"
        style={{ x: bodyX, y: bodyY }}
        animate={{ scale: isTouching ? 1.15 : (state === 'listening' ? 1.1 : 1) }}
        transition={{ scale: { duration: 0.3 } }}
      >
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
              rotate: hasConnected && wingScale === 1 ? 360 : 0,
            }}
            transition={{
              scale: { duration: 0.6, ease: "easeOut" },
              rotate: { duration: 0.6, ease: "easeOut" },
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

          <div id="body" className="relative mt-6 z-20">
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
              rotate: hasConnected && wingScale === 1 ? -360 : 0,
            }}
            transition={{
              scale: { duration: 0.6, ease: "easeOut", delay: 0.1 },
              rotate: { duration: 0.6, ease: "easeOut", delay: 0.1 },
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
    </div>
  );
}
