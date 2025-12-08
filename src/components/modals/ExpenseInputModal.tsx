import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { Allocation } from '../../utils/financeTypes';
import { allocationColorClasses } from '../../utils/financeTypes';

interface ExpenseInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseData) => void | Promise<void>;
  wallets: Allocation[]; // Available wallets to deduct from
}

export interface ExpenseData {
  amount: number;
  description: string;
  allocation_id: string;
}

export function ExpenseInputModal({
  isOpen,
  onClose,
  onSubmit,
  wallets,
}: ExpenseInputModalProps) {
  const [input, setInput] = useState('');
  const [parsedAmount, setParsedAmount] = useState<number | null>(null);
  const [parsedDescription, setParsedDescription] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setParsedAmount(null);
      setParsedDescription('');
      setError(null);
      setShowSuccess(false);
      // Default to living wallet if available
      const livingWallet = wallets.find(w => w.category === 'living');
      setSelectedWallet(livingWallet?.id || wallets[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only reset when modal opens, not when wallets change

  // Parse input as user types (e.g., "150 lunch" or "lunch 150")
  const parseInput = useCallback((value: string) => {
    setInput(value);
    setError(null);

    if (!value.trim()) {
      setParsedAmount(null);
      setParsedDescription('');
      return;
    }

    // Try to extract amount and description
    // Pattern 1: "150 lunch" or "150.50 coffee"
    // Pattern 2: "lunch 150" or "grab 85"
    const amountFirstMatch = value.match(/^(\d+(?:\.\d{1,2})?)\s*(.*)$/);
    const amountLastMatch = value.match(/^(.*?)\s*(\d+(?:\.\d{1,2})?)$/);

    let amount: number | null = null;
    let description = '';

    if (amountFirstMatch && amountFirstMatch[1]) {
      amount = parseFloat(amountFirstMatch[1]);
      description = amountFirstMatch[2]?.trim() || '';
    } else if (amountLastMatch && amountLastMatch[2]) {
      amount = parseFloat(amountLastMatch[2]);
      description = amountLastMatch[1]?.trim() || '';
    }

    setParsedAmount(amount);
    setParsedDescription(description);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }

    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) {
      setError('Invalid wallet selected');
      return;
    }

    if (parsedAmount > wallet.current_balance) {
      setError(`Not enough in ${wallet.name} (₱${wallet.current_balance.toLocaleString()} left)`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        amount: parsedAmount,
        description: parsedDescription || 'Expense',
        allocation_id: selectedWallet,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to log expense');
    } finally {
      setIsSubmitting(false);
    }
  }, [parsedAmount, parsedDescription, selectedWallet, wallets, onSubmit, onClose]);

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsedAmount && !isSubmitting) {
      handleSubmit();
    }
  }, [parsedAmount, isSubmitting, handleSubmit]);

  // Get active wallet for display
  const activeWallet = wallets.find(w => w.id === selectedWallet);
  const activeWalletColor = activeWallet 
    ? allocationColorClasses[activeWallet.color] || allocationColorClasses.emerald
    : allocationColorClasses.emerald;

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
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-24 z-50 max-w-md mx-auto"
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
                  background: `linear-gradient(90deg, transparent, ${activeWalletColor.glow}, transparent)`,
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

              <div className="p-5">
                {/* Header */}
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-white">Quick Log</h2>
                  <p className="text-sm text-white/40">Type amount and description</p>
                </div>

                {/* Main Input */}
                <div className="mb-4">
                  <div
                    className={cn(
                      'relative flex items-center gap-3 p-4',
                      rounded.lg,
                      'bg-white/[0.05] border',
                      error ? 'border-red-500/50' : 'border-white/[0.08]',
                      'focus-within:border-cyan-400/50 transition-colors'
                    )}
                  >
                    <span className="text-2xl text-white/30">₱</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => parseInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="150 lunch..."
                      className="flex-1 bg-transparent text-xl text-white placeholder-white/20 outline-none"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 mt-2 text-sm text-red-400"
                      >
                        <AlertCircle size={14} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Parsed Preview */}
                <AnimatePresence>
                  {parsedAmount && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className={cn(
                        'p-3 rounded-xl',
                        'bg-white/[0.03] border border-white/[0.06]'
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/50">
                            {parsedDescription || 'Expense'}
                          </span>
                          <span className={cn('text-lg font-bold', activeWalletColor.text)}>
                            -₱{parsedAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Wallet Selector */}
                <div className="mb-5">
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Deduct from</p>
                  <div className="flex gap-2">
                    {wallets.filter(w => w.current_balance > 0).map((wallet) => {
                      const colorClasses = allocationColorClasses[wallet.color] || allocationColorClasses.emerald;
                      const isSelected = selectedWallet === wallet.id;
                      return (
                        <button
                          key={wallet.id}
                          onClick={() => setSelectedWallet(wallet.id)}
                          className={cn(
                            'flex-1 p-3 rounded-xl text-left transition-all',
                            isSelected
                              ? `${colorClasses.bg} ${colorClasses.border} border`
                              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
                          )}
                        >
                          <p className={cn(
                            'text-sm font-medium',
                            isSelected ? colorClasses.text : 'text-white/70'
                          )}>
                            {wallet.name}
                          </p>
                          <p className="text-xs text-white/40">
                            ₱{wallet.current_balance.toLocaleString()} left
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!parsedAmount || isSubmitting}
                  className={cn(
                    'w-full py-4 rounded-xl font-medium transition-all',
                    'flex items-center justify-center gap-2',
                    parsedAmount && !isSubmitting
                      ? `${activeWalletColor.bg} ${activeWalletColor.text} border ${activeWalletColor.border} hover:brightness-110`
                      : 'bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Log Expense
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
