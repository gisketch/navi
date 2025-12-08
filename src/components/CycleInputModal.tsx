import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Calendar,
    Check,
    AlertCircle,
    Hash,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';
import type { FinancialCycle, CycleStatus } from '../utils/financeTypes';

interface CycleInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<FinancialCycle>) => Promise<void>;
    initialData?: FinancialCycle | null;
}

export function CycleInputModal({
    isOpen,
    onClose,
    onSubmit,
    initialData
}: CycleInputModalProps) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<CycleStatus>('upcoming');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && nameInputRef.current) {
            setTimeout(() => nameInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset or load data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setStartDate(initialData.start_date);
                setEndDate(initialData.end_date);
                setStatus(initialData.status);
            } else {
                setName('');
                // Default to today and 15 days from now
                const today = new Date().toISOString().split('T')[0];
                const nextTwoWeeks = new Date();
                nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
                setStartDate(today);
                setEndDate(nextTwoWeeks.toISOString().split('T')[0]);
                setStatus('upcoming');
            }
            setError(null);
            setShowSuccess(false);
        }
    }, [isOpen, initialData]);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) {
            setError('Cycle name is required');
            return;
        }
        if (!startDate) {
            setError('Start date is required');
            return;
        }
        if (!endDate) {
            setError('End date is required');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date must be before end date');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                start_date: startDate,
                end_date: endDate,
                status,
                ...(initialData ? { id: initialData.id } : {})
            });

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setError('Failed to save cycle');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, startDate, endDate, status, initialData, onSubmit, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-4 top-[10%] z-50 max-w-lg mx-auto"
                    >
                        <div
                            className={cn(
                                'relative overflow-hidden',
                                rounded.xl,
                                glass.modal,
                                'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
                            )}
                        >
                            {/* Top accent gradient */}
                            <div
                                className="absolute top-0 left-0 right-0 h-1"
                                style={{
                                    background: `linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.4), transparent)`,
                                }}
                            />

                            {/* Success overlay */}
                            <AnimatePresence>
                                {showSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm z-20 flex items-center justify-center"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', damping: 15 }}
                                            className="w-16 h-16 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center"
                                        >
                                            <Check className="w-8 h-8 text-emerald-400" />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                            >
                                <X size={20} className="text-white/50" />
                            </button>

                            <div className="p-6 space-y-6">
                                {/* Header */}
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {initialData ? 'Edit Cycle' : 'New Cycle'}
                                    </h2>
                                    <p className="text-sm text-white/40">Define a time period for your budget</p>
                                </div>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Cycle Name</label>
                                    <div
                                        className={cn(
                                            'flex items-center gap-3 p-3',
                                            rounded.lg,
                                            'bg-white/[0.03] border border-white/[0.08]',
                                            'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                        )}
                                    >
                                        <Hash size={18} className="text-white/30" />
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Early December 2024"
                                            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Start Date</label>
                                        <div
                                            className={cn(
                                                'flex items-center gap-3 p-3',
                                                rounded.lg,
                                                'bg-white/[0.03] border border-white/[0.08]',
                                                'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                            )}
                                        >
                                            <Calendar size={18} className="text-white/30" />
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-white/40 uppercase tracking-wider font-medium">End Date</label>
                                        <div
                                            className={cn(
                                                'flex items-center gap-3 p-3',
                                                rounded.lg,
                                                'bg-white/[0.03] border border-white/[0.08]',
                                                'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                            )}
                                        >
                                            <Calendar size={18} className="text-white/30" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Status</label>
                                    <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                                        {(['upcoming', 'active', 'completed'] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s)}
                                                className={cn(
                                                    'flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize',
                                                    status === s
                                                        ? 'bg-white/10 text-white shadow-sm'
                                                        : 'text-white/40 hover:text-white/70'
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Error Message */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                        >
                                            <AlertCircle size={16} />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'w-full py-3.5 rounded-xl font-medium transition-all',
                                        'flex items-center justify-center gap-2',
                                        'bg-white text-black hover:bg-white/90 active:scale-[0.98]',
                                        isSubmitting && 'opacity-70 cursor-not-allowed'
                                    )}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            {initialData ? 'Update Cycle' : 'Create Cycle'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
