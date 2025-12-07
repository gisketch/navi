import { useRef, useEffect, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { FileText, Calendar, Box, X } from 'lucide-react';
import type { CardData } from '../utils/constants';

interface ResultCardsProps {
    cards: CardData[];
    className?: string;
    onClose?: () => void;
}

export function ResultCards({ cards, className = '', onClose }: ResultCardsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [constraints, setConstraints] = useState({ left: 0, right: 0 });

    if (!cards || cards.length === 0) return null;

    useEffect(() => {
        const updateConstraints = () => {
            if (containerRef.current && sliderRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const sliderWidth = sliderRef.current.scrollWidth;

                // If slider is smaller than container, no drag needed (but drag=x handles this basically)
                // Calculate max drag distance (negative value)
                // Add some padding to the calculation if needed
                const maxDrag = Math.min(0, containerWidth - sliderWidth - 32); // 32 for padding
                setConstraints({ left: maxDrag, right: 0 });
            }
        };

        updateConstraints();
        window.addEventListener('resize', updateConstraints);
        return () => window.removeEventListener('resize', updateConstraints);
    }, [cards]);


    const getIcon = (type: CardData['card_type']) => {
        switch (type) {
            case 'notes': return <FileText size={16} className="text-white/70" />;
            case 'calendar': return <Calendar size={16} className="text-white/70" />;
            default: return <Box size={16} className="text-white/70" />;
        }
    };

    const handleCardClick = (card: CardData) => {
        if (card.card_type === 'notes') {
            const uri = `obsidian://open?file=${encodeURIComponent(card.card_title)}`;
            window.open(uri, '_self');
        }
    };

    return (
        <div className={`relative w-full group ${className}`}>
            {/* Close Button */}
            {onClose && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-10 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors z-10"
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                >
                    <X size={16} />
                </motion.button>
            )}

            {/* Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full overflow-hidden py-4" /* Hidden overflow for drag container */
                ref={containerRef}
            >
                {/* Draggable Slider */}
                <motion.div
                    ref={sliderRef}
                    drag="x"
                    dragConstraints={constraints}
                    dragElastic={0.2} /* Spring feel */
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }} /* Smooth finish */
                    className="flex gap-3 px-4 min-w-min cursor-grab active:cursor-grabbing"
                    whileTap={{ cursor: "grabbing" }}
                >
                    {cards.map((card, index) => (
                        <motion.button
                            key={`${card.card_title}-${index}`}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleCardClick(card)}
                            className="flex-shrink-0 w-64 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all shadow-lg text-left hover:border-white/20 active:scale-95 select-none"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    {getIcon(card.card_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-white truncate mb-1">
                                        {card.card_title}
                                    </h4>
                                    <p className="text-xs text-white/50 line-clamp-3 leading-relaxed">
                                        {card.card_description}
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
