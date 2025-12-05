import { motion, useAnimationControls, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useMemo } from 'react';

export type NaviState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface NaviProps {
  state?: NaviState;
  audioLevel?: number; // 0-1, for mic input or output volume
}

// Color schemes for each state
const stateColors = {
  idle: {
    primary: '#00ffff',
    secondary: '#00aaff',
    glow: 'rgba(0,255,255,0.5)',
    glowOuter: 'rgba(0,170,255,0.3)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0ffff 25%, #00ffff 60%, rgba(0,170,255,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(34,211,238,0.6) 0%, rgba(34,211,238,0) 70%)',
  },
  listening: {
    primary: '#ffdd00',
    secondary: '#ffaa00',
    glow: 'rgba(255,221,0,0.6)',
    glowOuter: 'rgba(255,170,0,0.4)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #fffde0 25%, #ffdd00 60%, rgba(255,170,0,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(255,221,0,0.6) 0%, rgba(255,221,0,0) 70%)',
  },
  thinking: {
    primary: '#00ff88',
    secondary: '#00cc66',
    glow: 'rgba(0,255,136,0.6)',
    glowOuter: 'rgba(0,204,102,0.4)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0fff0 25%, #00ff88 60%, rgba(0,204,102,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(0,255,136,0.6) 0%, rgba(0,255,136,0) 70%)',
  },
  speaking: {
    primary: '#00ffff',
    secondary: '#00aaff',
    glow: 'rgba(0,255,255,0.6)',
    glowOuter: 'rgba(0,170,255,0.4)',
    gradient: 'radial-gradient(circle, #ffffff 0%, #e0ffff 25%, #00ffff 60%, rgba(0,170,255,0.4) 100%)',
    outerGradient: 'radial-gradient(circle, rgba(34,211,238,0.7) 0%, rgba(34,211,238,0) 70%)',
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

// Main container animation variants
const containerVariants: Variants = {
  idle: {
    scale: 1,
    x: [0, 12, 0, -12, 0],
    y: [0, -8, 0, -8, 0],
    transition: {
      scale: { duration: 0.3 },
      x: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
  },
  listening: {
    scale: 1.1,
    x: 0,
    y: [0, -5, 0],
    transition: {
      scale: { duration: 0.3 },
      y: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
    },
  },
  thinking: {
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      scale: { duration: 0.3 },
    },
  },
  speaking: {
    scale: 1,
    x: 0,
    y: [0, -6, 0],
    transition: {
      scale: { duration: 0.3 },
      y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

// Wing flap speed based on state
const getWingSpeed = (state: NaviState) => {
  switch (state) {
    case 'listening': return 0.12; // Fast buzzing
    case 'thinking': return 0.5; // Slow, calm
    case 'speaking': return 0.2; // Medium excited
    default: return 0.32; // Normal idle
  }
};

export function Navi({ state = 'idle', audioLevel = 0 }: NaviProps) {
  const particles = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1];
  const colors = stateColors[state];
  const flapSpeed = getWingSpeed(state);
  
  const bodyControls = useAnimationControls();
  
  // Motion values for the main body position
  const bodyX = useMotionValue(0);
  const bodyY = useMotionValue(0);
  
  // Springs that follow the body with dampening/drag effect
  const glowX = useSpring(bodyX, { stiffness: 50, damping: 20 });
  const glowY = useSpring(bodyY, { stiffness: 50, damping: 20 });
  
  // Animate body position based on state
  useEffect(() => {
    let animationFrame: number;
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (state === 'idle') {
        // Figure-8 movement
        const t = (elapsed % 3) / 3 * Math.PI * 2;
        bodyX.set(Math.sin(t) * 12);
        bodyY.set(Math.sin(t * 2) * -8);
      } else if (state === 'listening') {
        // Gentle bobbing
        const t = (elapsed % 0.5) / 0.5 * Math.PI * 2;
        bodyX.set(0);
        bodyY.set(Math.sin(t) * -5);
      } else if (state === 'speaking') {
        // Gentle floating
        const t = (elapsed % 1.5) / 1.5 * Math.PI * 2;
        bodyX.set(0);
        bodyY.set(Math.sin(t) * -6);
      } else {
        // Thinking - stay still
        bodyX.set(0);
        bodyY.set(0);
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [state, bodyX, bodyY]);
  
  // Dynamic body scale based on audio level (for listening/speaking)
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const scale = 1 + audioLevel * 0.15;
      bodyControls.start({
        scale: [scale, scale * 1.05, scale],
        transition: { duration: 0.1 },
      });
    }
  }, [audioLevel, state, bodyControls]);

  // Glow intensity based on audio level
  const glowIntensity = state === 'listening' || state === 'speaking' 
    ? 0.3 + audioLevel * 0.5 
    : 0.3;

  return (
    <div className="relative flex items-center justify-center">
      {/* Big gradient circle glow - follows body with drag */}
      <motion.div
        className="absolute z-0 size-40 rounded-full blur-xl"
        style={{ 
          background: colors.outerGradient,
          x: glowX,
          y: glowY,
        }}
        animate={{
          scale: state === 'thinking' ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: [0.4 + glowIntensity, 0.6 + glowIntensity, 0.4 + glowIntensity],
        }}
        transition={{
          duration: state === 'thinking' ? 0.5 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Simple circle glow on top - follows body with drag */}
      <motion.div
        className="absolute z-0 size-20 rounded-full blur-md"
        style={{ 
          backgroundColor: colors.primary, 
          x: glowX,
          y: glowY,
        }}
        animate={{ opacity: glowIntensity + 0.2 }}
      />

      {/* Main Navi container */}
      <motion.div
        className="relative z-10"
        style={{ x: bodyX, y: bodyY }}
        animate={{ scale: state === 'listening' ? 1.1 : 1 }}
        transition={{ scale: { duration: 0.3 } }}
      >
        {/* Particles */}
        {particles.map((delay, index) => (
          <Particle key={`${state}-${index}`} delay={delay} state={state} />
        ))}

        <div className="flex flex-row items-center justify-center">
          <div className="flex flex-col items-end -mr-4">
            <motion.img
              key={`wing-lt-${flapSpeed}`}
              className="size-16 origin-right"
              src='wingtop.png'
              id="wing-left-top"
              animate={{ scaleX: [1, 0.4, 1], scaleY: [0.8, 1, 0.8] }}
              transition={{ duration: flapSpeed, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.img
              key={`wing-lb-${flapSpeed}`}
              className="size-8 origin-right"
              src='wingbot.png'
              id="wing-left-bot"
              animate={{ scaleX: [1, 0.4, 1] }}
              transition={{ duration: flapSpeed, repeat: Infinity, ease: "easeIn" }}
            />
          </div>

          <div id="body" className="relative mt-6 z-20">
            {/* Outer glow circle */}
            <motion.div
              className="absolute inset-0 size-16 -translate-x-2 -translate-y-2 rounded-full blur-sm"
              animate={{ opacity: glowIntensity }}
              style={{ background: colors.gradient }}
            />
            {/* Main body sphere */}
            <motion.div
              className="size-12 rounded-full"
              style={{
                background: colors.gradient,
                boxShadow: `0 0 20px 8px ${colors.glow}, 0 0 40px 16px ${colors.glowOuter}`,
              }}
              animate={
                state === 'thinking'
                  ? { scale: [1, 1.15, 1], opacity: [1, 0.85, 1] }
                  : state === 'idle'
                    ? { scale: [1, 1.08, 1], opacity: [1, 0.9, 1] }
                    : undefined
              }
              transition={
                state === 'thinking'
                  ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
                  : state === 'idle'
                    ? {
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.2, repeat: Infinity, ease: "easeInOut" },
                      }
                    : undefined
              }
              // Use controls for audio-reactive animation
              {...(state === 'listening' || state === 'speaking' ? { animate: bodyControls } : {})}
            />
          </div>

          <div className="flex flex-col -ml-4">
            <motion.img
              key={`wing-rt-${flapSpeed}`}
              className="size-16 origin-right -translate-x-full"
              src='wingtop.png'
              id="wing-right-top"
              initial={{ scaleX: -1 }}
              animate={{ scaleX: [-1, -0.4, -1], scaleY: [0.8, 1, 0.8] }}
              transition={{ duration: flapSpeed, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.img
              key={`wing-rb-${flapSpeed}`}
              className="size-8 origin-right -translate-x-full"
              src='wingbot.png'
              id="wing-right-bot"
              initial={{ scaleX: -1 }}
              animate={{ scaleX: [-1, -0.4, -1] }}
              transition={{ duration: flapSpeed, repeat: Infinity, ease: "easeIn" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
