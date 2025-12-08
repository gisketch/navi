import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  CreditCard,
  Check,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';
import type { Allocation } from '../utils/financeTypes';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, description?: string) => Promise<void>;
  allocation: Allocation | null;
  allocationType: 'bill' | 'debt';
}

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  allocation,
  allocationType,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payFull, setPayFull] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && allocation) {
      setAmount(allocation.current_balance.toString());
      setDescription(`${allocationType === 'bill' ? 'Bill payment' : 'Debt payment'}: ${allocation.name}`);
      setPayFull(true);
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen, allocation, allocationType]);

  // Update amount when payFull changes
  useEffect(() => {
    if (allocation && payFull) {
      setAmount(allocation.current_balance.toString());
    }
  }, [payFull, allocation]);

  const handleSubmit = useCallback(async () => {
    if (!allocation) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > allocation.current_balance) {
      setError('Amount cannot exceed remaining balance');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(amountNum, description || undefined);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  }, [allocation, amount, description, onSubmit, onClose]);

  const isBill = allocationType === 'bill';
  const accentColor = isBill ? 'purple' : 'red';
  const Icon = isBill ? Receipt : CreditCard;

  return (
    <AnimatePresence>
      {isOpen && allocation && (
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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
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
                  background: `linear-gradient(90deg, transparent, ${isBill ? 'rgba(168, 85, 247, 0.5)' : 'rgba(239, 68, 68, 0.5)'}, transparent)`,
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
                <div className="mb-5 flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    `bg-${accentColor}-500/20 border border-${accentColor}-500/30`
                  )}>
                    <Icon className={`w-6 h-6 text-${accentColor}-400`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Pay {isBill ? 'Bill' : 'Debt'}
                    </h2>
                    <p className="text-sm text-white/40">{allocation.name}</p>
                  </div>
                </div>

                {/* Current Balance */}
                <div className={cn(
                  'p-4 mb-4',
                  rounded.lg,
                  'bg-white/[0.03] border border-white/[0.08]'
                )}>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Amount Due</p>
                  <p className={`text-2xl font-bold text-${accentColor}-400`}>
                    ₱{allocation.current_balance.toLocaleString()}
                  </p>
                </div>

                {/* Pay Full Toggle */}
                <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      payFull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'
                    )}>
                      <Banknote size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Pay in Full</p>
                      <p className="text-xs text-white/40">Clear the entire balance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPayFull(!payFull)}
                    className={cn(
                      'w-11 h-6 rounded-full relative transition-colors',
                      payFull ? 'bg-emerald-500' : 'bg-white/20'
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                      payFull && 'translate-x-5'
                    )} />
                  </button>
                </div>

                {/* Amount Input (if not paying full) */}
                {!payFull && (
                  <div className="mb-4">
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                      Payment Amount
                    </label>
                    <div className={cn(
                      'flex items-center gap-2 p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus-within:border-cyan-400/50 transition-colors'
                    )}>
                      <span className="text-white/30">₱</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Description Input */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Payment note..."
                    className={cn(
                      'w-full p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'text-white placeholder-white/20 outline-none',
                      'focus:border-cyan-400/50 transition-colors'
                    )}
                  />
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 mb-4 text-sm text-red-400"
                    >
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!amount || isSubmitting}
                  className={cn(
                    'w-full py-4 rounded-xl font-medium transition-all',
                    'flex items-center justify-center gap-2',
                    amount && !isSubmitting
                      ? `bg-${accentColor}-500/20 text-${accentColor}-400 border border-${accentColor}-500/30 hover:brightness-110`
                      : 'bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm Payment
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
