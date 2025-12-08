import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    FileJson,
    Check,
    AlertCircle,
    Type,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';

// Simple interface since we're just handling generic JSON for now
interface BudgetTemplateInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; allocation_rules: any }) => Promise<void>;
    initialData?: { id?: string; name: string; allocation_rules: any } | null;
}

export function BudgetTemplateInputModal({
    isOpen,
    onClose,
    onSubmit,
    initialData
}: BudgetTemplateInputModalProps) {
    const [name, setName] = useState('');
    const [rulesBuffer, setRulesBuffer] = useState('');
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
                // Pretty print the existing rules
                setRulesBuffer(JSON.stringify(initialData.allocation_rules || {}, null, 2));
            } else {
                setName('');
                // Default template scaffold
                setRulesBuffer(JSON.stringify({
                    "living": 50,
                    "play": 30,
                    "savings": 20
                }, null, 2));
            }
            setError(null);
            setShowSuccess(false);
        }
    }, [isOpen, initialData]);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) {
            setError('Template name is required');
            return;
        }

        let parsedRules: any;
        try {
            parsedRules = JSON.parse(rulesBuffer);
        } catch (e) {
            setError('Invalid JSON format for allocation rules');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                allocation_rules: parsedRules,
                ...(initialData?.id ? { id: initialData.id } : {})
            });

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setError('Failed to save template');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, rulesBuffer, initialData, onSubmit, onClose]);

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
                                    background: `linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent)`,
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
                                        {initialData ? 'Edit Template' : 'New Template'}
                                    </h2>
                                    <p className="text-sm text-white/40">Define reusable allocation rules</p>
                                </div>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Template Name</label>
                                    <div
                                        className={cn(
                                            'flex items-center gap-3 p-3',
                                            rounded.lg,
                                            'bg-white/[0.03] border border-white/[0.08]',
                                            'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                        )}
                                    >
                                        <Type size={18} className="text-white/30" />
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., 50/30/20 Rule"
                                            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                {/* JSON Rules Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium flex items-center gap-2">
                                        Allocation Rules (JSON)
                                        <FileJson size={12} className="text-white/30" />
                                    </label>
                                    <div
                                        className={cn(
                                            'p-3',
                                            rounded.lg,
                                            'bg-white/[0.03] border border-white/[0.08]',
                                            'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                        )}
                                    >
                                        <textarea
                                            value={rulesBuffer}
                                            onChange={(e) => setRulesBuffer(e.target.value)}
                                            placeholder='{"living": 50, ...}'
                                            className="w-full bg-transparent text-white/90 placeholder-white/20 outline-none text-xs font-mono h-32 resize-none"
                                            spellCheck={false}
                                        />
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
                                            {initialData ? 'Update Template' : 'Create Template'}
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
