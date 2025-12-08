import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Wallet,
    Check,
    AlertCircle,
    Tag,
    Shield,
    Layers,
    Banknote,
    Trash2,
} from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { Allocation, MoneyDrop, AllocationCategory } from '../../utils/financeTypes';

interface AllocationInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Allocation>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    moneyDrops: MoneyDrop[]; // Available money drops to link to
    initialData?: Allocation | null;
}

export function AllocationInputModal({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    moneyDrops,
    initialData
}: AllocationInputModalProps) {
    const [name, setName] = useState('');
    const [moneyDropId, setMoneyDropId] = useState('');
    const [totalBudget, setTotalBudget] = useState<string>('');
    const [currentBalance, setCurrentBalance] = useState<string>('');
    const [type, setType] = useState<AllocationCategory>('living');
    const [isStrict, setIsStrict] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const nameInputRef = useRef<HTMLInputElement>(null);
    const isEditMode = !!initialData;

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && nameInputRef.current && !isEditMode) {
            setTimeout(() => nameInputRef.current?.focus(), 100);
        }
    }, [isOpen, isEditMode]);

    // Reset or load data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setMoneyDropId(initialData.money_drop_id);
                setTotalBudget(initialData.total_budget.toString());
                setCurrentBalance(initialData.current_balance.toString());
                setType(initialData.category);
                setIsStrict(initialData.is_strict);
            } else {
                setName('');
                // Default to most recent received money drop
                const receivedDrops = moneyDrops.filter(d => d.is_received);
                const defaultDrop = receivedDrops[receivedDrops.length - 1] || moneyDrops[0];
                setMoneyDropId(defaultDrop?.id || '');
                setTotalBudget('');
                setCurrentBalance('');
                setType('living');
                setIsStrict(false);
            }
            setError(null);
            setShowSuccess(false);
            setShowDeleteConfirm(false);
        }
    }, [isOpen, initialData, moneyDrops]);

    const handleSubmit = useCallback(async () => {
        if (!moneyDropId) {
            setError('Please select a money drop');
            return;
        }
        if (!name.trim()) {
            setError('Allocation name is required');
            return;
        }
        const budgetValue = parseFloat(totalBudget);
        if (!totalBudget || isNaN(budgetValue) || budgetValue <= 0) {
            setError('Please enter a valid budget amount');
            return;
        }

        // For edit mode, validate current balance
        const balanceValue = isEditMode 
            ? parseFloat(currentBalance) 
            : budgetValue;
        if (isEditMode && (isNaN(balanceValue) || balanceValue < 0 || balanceValue > budgetValue)) {
            setError('Remaining balance must be between 0 and total budget');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                money_drop_id: moneyDropId,
                total_budget: budgetValue,
                current_balance: balanceValue,
                category: type,
                is_strict: isStrict,
                ...(initialData ? { id: initialData.id } : {})
            });

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setError(isEditMode ? 'Failed to update allocation' : 'Failed to create allocation');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, moneyDropId, totalBudget, currentBalance, type, isStrict, initialData, isEditMode, onSubmit, onClose]);

    const handleDelete = useCallback(async () => {
        if (!initialData?.id || !onDelete) return;
        
        setIsSubmitting(true);
        try {
            await onDelete(initialData.id);
            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            setError('Failed to delete allocation');
        } finally {
            setIsSubmitting(false);
        }
    }, [initialData, onDelete, onClose]);

    const CATEGORY_OPTIONS: { id: AllocationCategory; label: string; icon: any }[] = [
        { id: 'living', label: 'Living', icon: Wallet },
        { id: 'play', label: 'Play', icon: Sparkles },
        { id: 'bills', label: 'Bill', icon: Layers },
        { id: 'savings', label: 'Savings', icon: Shield },
        { id: 'debt', label: 'Debt', icon: Banknote },
    ];

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
                                    background: `linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.4), transparent)`,
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

                            {/* Delete Confirm overlay */}
                            <AnimatePresence>
                                {showDeleteConfirm && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6"
                                    >
                                        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                                        <p className="text-white text-center mb-6">Delete "{name}"?</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
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
                                        {initialData ? 'Edit Allocation' : 'New Allocation'}
                                    </h2>
                                    <p className="text-sm text-white/40">Create a wallet for a specific purpose</p>
                                </div>

                                {/* Money Drop Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Link to Money Drop</label>
                                    <div className="relative">
                                        <select
                                            value={moneyDropId}
                                            onChange={(e) => setMoneyDropId(e.target.value)}
                                            className={cn(
                                                'w-full p-3 rounded-lg outline-none appearance-none cursor-pointer',
                                                'bg-white/[0.06] border border-white/[0.12] text-white text-sm',
                                                'focus:border-cyan-400/50 focus:bg-white/[0.08] transition-all',
                                                'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
                                                'backdrop-blur-sm',
                                                '[&>option]:bg-[#1a1f2e] [&>option]:text-white'
                                            )}
                                        >
                                            <option value="" disabled className="bg-[#1a1f2e]">Select a money drop...</option>
                                            {moneyDrops.map((d) => (
                                                <option key={d.id} value={d.id} className="bg-[#1a1f2e]">
                                                    {d.name} - ₱{d.amount.toLocaleString()} ({d.type})
                                                </option>
                                            ))}
                                        </select>
                                        {/* Custom dropdown arrow */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Wallet Name</label>
                                    <div
                                        className={cn(
                                            'flex items-center gap-3 p-3',
                                            rounded.lg,
                                            'bg-white/[0.03] border border-white/[0.08]',
                                            'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                        )}
                                    >
                                        <Tag size={18} className="text-white/30" />
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Living Wallet, Travel Fund"
                                            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Budget Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Total Budget</label>
                                    <div
                                        className={cn(
                                            'flex items-center gap-3 p-3',
                                            rounded.lg,
                                            'bg-white/[0.03] border border-white/[0.08]',
                                            'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                        )}
                                    >
                                        <span className="text-white/30 font-medium">₱</span>
                                        <input
                                            type="number"
                                            value={totalBudget}
                                            onChange={(e) => setTotalBudget(e.target.value)}
                                            placeholder="0.00"
                                            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-lg font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Remaining Balance (Edit mode only) */}
                                {isEditMode && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Remaining Balance</label>
                                        <div
                                            className={cn(
                                                'flex items-center gap-3 p-3',
                                                rounded.lg,
                                                'bg-white/[0.03] border border-white/[0.08]',
                                                'focus-within:border-cyan-400/50 focus-within:bg-white/[0.05] transition-all'
                                            )}
                                        >
                                            <span className="text-white/30 font-medium">₱</span>
                                            <input
                                                type="number"
                                                value={currentBalance}
                                                onChange={(e) => setCurrentBalance(e.target.value)}
                                                placeholder={totalBudget || '0.00'}
                                                className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-lg font-medium"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Type Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Category Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CATEGORY_OPTIONS.map((opt) => {
                                            const Icon = opt.icon;
                                            const isSelected = type === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setType(opt.id)}
                                                    className={cn(
                                                        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all',
                                                        isSelected
                                                            ? 'bg-white/10 text-white border border-white/20'
                                                            : 'bg-white/[0.03] text-white/40 border border-white/[0.05] hover:bg-white/[0.05]'
                                                    )}
                                                >
                                                    <Icon size={18} />
                                                    <span className="text-xs font-medium">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Strict Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center',
                                            isStrict ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'
                                        )}>
                                            <Shield size={14} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Strict Allocation</p>
                                            <p className="text-xs text-white/40">Mark as essential (Survival money)</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsStrict(!isStrict)}
                                        className={cn(
                                            'w-11 h-6 rounded-full relative transition-colors',
                                            isStrict ? 'bg-amber-500' : 'bg-white/20'
                                        )}
                                    >
                                        <div className={cn(
                                            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                                            isStrict && 'translate-x-5'
                                        )} />
                                    </button>
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

                                {/* Action Buttons */}
                                <div className="space-y-3">
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
                                                {initialData ? 'Update Allocation' : 'Create Allocation'}
                                            </>
                                        )}
                                    </button>

                                    {/* Delete Button (Edit mode only) */}
                                    {isEditMode && onDelete && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className={cn(
                                                'w-full py-3 rounded-xl font-medium transition-all',
                                                'flex items-center justify-center gap-2',
                                                'bg-red-500/10 text-red-400 border border-red-500/20',
                                                'hover:bg-red-500/20 hover:border-red-500/30'
                                            )}
                                        >
                                            <Trash2 size={18} />
                                            Delete Allocation
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
