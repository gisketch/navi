import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CreditCard,
  Zap,
  Home,
  Calendar,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';

interface SubscriptionInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionData) => Promise<void>;
}

export interface SubscriptionData {
  name: string;
  amount: number;
  billing_day: number;
  category: 'subscription' | 'utility' | 'rent';
  is_active: boolean;
}

const CATEGORY_OPTIONS = [
  { id: 'subscription', label: 'Subscription', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { id: 'utility', label: 'Utility', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { id: 'rent', label: 'Rent', icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
] as const;

export function SubscriptionInputModal({
  isOpen,
  onClose,
  onSubmit,
}: SubscriptionInputModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [category, setCategory] = useState<'subscription' | 'utility' | 'rent'>('subscription');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameRef.current) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setAmount('');
      setBillingDay('1');
      setCategory('subscription');
      setIsActive(true);
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const day = parseInt(billingDay);
    if (!day || day < 1 || day > 31) {
      setError('Billing day must be between 1 and 31');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        amount: amountNum,
        billing_day: day,
        category,
        is_active: isActive,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, amount, billingDay, category, isActive, onSubmit, onClose]);

  const selectedCategoryConfig = CATEGORY_OPTIONS.find(c => c.id === category)!;

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
                  background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
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
                  <h2 className="text-lg font-semibold text-white">Add Subscription/Bill</h2>
                  <p className="text-sm text-white/40">Track recurring payments</p>
                </div>

                {/* Name Input */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Name</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Netflix, Electric bill, Rent"
                    className={cn(
                      'w-full p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'text-white placeholder-white/20 outline-none',
                      'focus:border-cyan-400/50 transition-colors'
                    )}
                  />
                </div>

                {/* Amount and Billing Day */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Amount</label>
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
                        className="flex-1 bg-transparent text-white placeholder-white/20 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Billing Day</label>
                    <div className={cn(
                      'flex items-center gap-2 p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus-within:border-cyan-400/50 transition-colors'
                    )}>
                      <Calendar size={16} className="text-white/30" />
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={billingDay}
                        onChange={(e) => setBillingDay(e.target.value)}
                        placeholder="1"
                        className="flex-1 bg-transparent text-white placeholder-white/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = category === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setCategory(opt.id)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
                            isSelected
                              ? `${opt.bg} ${opt.border} border`
                              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
                          )}
                        >
                          <Icon size={18} className={isSelected ? opt.color : 'text-white/40'} />
                          <span className={cn(
                            'text-xs',
                            isSelected ? opt.color : 'text-white/40'
                          )}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="mb-5">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Status</label>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      'w-full p-3 rounded-xl transition-all flex items-center justify-between',
                      isActive
                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                        : 'bg-white/[0.03] border border-white/[0.06]'
                    )}
                  >
                    <span className={isActive ? 'text-emerald-400' : 'text-white/40'}>
                      {isActive ? 'Active' : 'Paused'}
                    </span>
                    <div className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      isActive ? 'bg-emerald-500/30' : 'bg-white/10'
                    )}>
                      <motion.div
                        animate={{ x: isActive ? 18 : 2 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full',
                          isActive ? 'bg-emerald-400' : 'bg-white/40'
                        )}
                      />
                    </div>
                  </button>
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
                  disabled={!name || !amount || isSubmitting}
                  className={cn(
                    'w-full py-4 rounded-xl font-medium transition-all',
                    'flex items-center justify-center gap-2',
                    name && amount && !isSubmitting
                      ? `${selectedCategoryConfig.bg} ${selectedCategoryConfig.color} border ${selectedCategoryConfig.border} hover:brightness-110`
                      : 'bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Add {selectedCategoryConfig.label}
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
