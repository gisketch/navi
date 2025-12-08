import { motion, AnimatePresence } from 'framer-motion';
import type { Transition, Easing } from 'framer-motion';

interface AnimatedBackgroundProps {
    mode: 'dashboard' | 'chat';
}

// Animation properties for floating effect
const floatTransition: Transition = {
    duration: 20,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut" as Easing,
};

export function AnimatedBackground({ mode }: AnimatedBackgroundProps) {
    // Color themes for different modes
    const colors = {
        dashboard: [
            'rgba(6, 182, 212, 0.25)',  // Cyan
            'rgba(168, 85, 247, 0.2)',  // Purple
            'rgba(59, 130, 246, 0.2)',  // Blue
        ],
        chat: [
            'rgba(249, 115, 22, 0.2)',  // Orange
            'rgba(34, 211, 238, 0.15)', // Cyan
            'rgba(251, 146, 60, 0.15)', // Amber/Orange light
        ],
    };

    const currentColors = mode === 'chat' ? colors.chat : colors.dashboard;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black">
            {/* Dynamic Orbs */}
            <AnimatePresence mode='wait'>
                <motion.div
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2 }} // Smooth crossfade between modes
                    className="absolute inset-0"
                >
                    {/* Orb 1: Top Left - Main accent */}
                    <motion.div
                        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] md:blur-[120px]"
                        style={{ background: currentColors[0] }}
                        animate={{
                            x: [0, 50, 0],
                            y: [0, 30, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={floatTransition}
                    />

                    {/* Orb 2: Bottom Right - Secondary accent */}
                    <motion.div
                        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] md:blur-[130px]"
                        style={{ background: currentColors[1] }}
                        animate={{
                            x: [0, -30, 0],
                            y: [0, -50, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{ ...floatTransition, duration: 25, delay: 2 }}
                    />

                    {/* Orb 3: Center/Floating - Ambient fill */}
                    <motion.div
                        className="absolute top-[20%] left-[30%] w-[40vw] h-[40vw] rounded-full blur-[90px] md:blur-[110px]"
                        style={{ background: currentColors[2] }}
                        animate={{
                            x: [0, 40, -20, 0],
                            y: [0, -40, 20, 0],
                            scale: [1, 0.9, 1.1, 1],
                        }}
                        transition={{ ...floatTransition, duration: 30, delay: 5 }}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Noise texture overlay for texture (optional, minimal opacity) */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
