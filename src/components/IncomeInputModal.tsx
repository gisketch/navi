import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  DollarSign,
  Check,
  AlertCircle,
  Briefcase,
  Gift,
  Banknote,
  Laptop,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';
import type { Income, FinancialCycle } from '../utils/financeTypes';

interface IncomeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Income, 'id'>) => Promise<void>;
  cycles: FinancialCycle[];
  initialData?: Income | null;
}

// Quick source suggestions
const QUICK_SOURCES = [
  { id: 'salary', icon: Briefcase, label: 'Salary' },
  { id: 'freelance', icon: Laptop, label: 'Freelance' },
  { id: 'gift', icon: Gift, label: 'Gift' },
  { id: 'other', icon: Banknote, label: 'Other' },
];

export function IncomeInputModal({
  isOpen,
  onClose,
  onSubmit,
  cycles,
  initialData,
}: IncomeInputModalProps) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset or load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setSource(initialData.source);
        setCycleId(initialData.cycle_id);
        setDateReceived(initialData.date_received);
        setIsConfirmed(initialData.is_confirmed);
      } else {
        setAmount('');
        setSource('');
        // Default to active cycle
        const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
        setCycleId(activeCycle?.id || '');
        setDateReceived(new Date().toISOString().split('T')[0]);
        setIsConfirmed(true);
      }
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen, initialData, cycles]);

  const handleQuickSource = useCallback((sourceLabel: string) => {
    setSource(sourceLabel);
  }, []);

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!source.trim()) {
      setError('Please enter the income source');
      return;
    }
    if (!cycleId) {
      setError('Please select a cycle');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        amount: parsedAmount,
        source: source.trim(),
        cycle_id: cycleId,
        date_received: dateReceived || new Date().toISOString().split('T')[0],
        is_confirmed: isConfirmed,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add income');
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, source, cycleId, dateReceived, isConfirmed, onSubmit, onClose]);

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

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
            className={cn(
              'fixed left-4 right-4 bottom-4 z-50',
              'sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2',
              'sm:w-full sm:max-w-md',
              rounded.xl,
              glass.card,
              'border border-white/10',
              'overflow-hidden'
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2',
                  rounded.lg,
                  'bg-emerald-500/20 border border-emerald-500/30'
                )}>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {initialData ? 'Edit Income' : 'Add Income'}
                  </h2>
                  <p className="text-xs text-white/40">Record money received</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2',
                  rounded.lg,
                  'hover:bg-white/10 transition-colors'
                )}
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-lg font-bold">
                    ₱
                  </span>
                  <input
                    ref={amountInputRef}
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      'w-full pl-10 pr-4 py-3',
                      rounded.lg,
                      'bg-white/5 border border-white/10',
                      'text-2xl font-bold text-white placeholder:text-white/20',
                      'focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30',
                      'transition-all'
                    )}
                  />
                </div>
              </div>

              {/* Quick Sources */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Source
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {QUICK_SOURCES.map((item) => {
                    const Icon = item.icon;
                    const isSelected = source.toLowerCase() === item.label.toLowerCase();
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleQuickSource(item.label)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2',
                          rounded.lg,
                          'transition-all',
                          isSelected
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                        )}
                      >
                        <Icon size={18} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Netzon Salary"
                  className={cn(
                    'w-full px-4 py-2.5',
                    rounded.lg,
                    'bg-white/5 border border-white/10',
                    'text-sm text-white placeholder:text-white/30',
                    'focus:outline-none focus:border-emerald-500/50',
                    'transition-all'
                  )}
                />
              </div>

              {/* Cycle Selection */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Cycle
                </label>
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5',
                    rounded.lg,
                    'bg-white/5 border border-white/10',
                    'text-sm text-white',
                    'focus:outline-none focus:border-emerald-500/50',
                    'transition-all'
                  )}
                >
                  <option value="" className="bg-gray-900">Select a cycle</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id} className="bg-gray-900">
                      {cycle.name} {cycle.status === 'active' && '(Active)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Confirmed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5',
                      rounded.lg,
                      'bg-white/5 border border-white/10',
                      'text-sm text-white',
                      'focus:outline-none focus:border-emerald-500/50',
                      'transition-all'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Status
                  </label>
                  <button
                    onClick={() => setIsConfirmed(!isConfirmed)}
                    className={cn(
                      'w-full px-4 py-2.5',
                      rounded.lg,
                      'border transition-all text-sm font-medium',
                      isConfirmed
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    )}
                  >
                    {isConfirmed ? 'Received' : 'Expected'}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'flex items-center gap-2 p-3',
                      rounded.lg,
                      'bg-red-500/10 border border-red-500/30',
                      'text-sm text-red-400'
                    )}
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting || showSuccess}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-3',
                  rounded.lg,
                  'font-semibold text-sm',
                  'transition-all',
                  showSuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
                  'disabled:opacity-50',
                  'flex items-center justify-center gap-2'
                )}
              >
                {showSuccess ? (
                  <>
                    <Check size={18} />
                    Added!
                  </>
                ) : isSubmitting ? (
                  <>
                    <Sparkles size={18} className="animate-pulse" />
                    Adding...
                  </>
                ) : (
                  <>
                    <DollarSign size={18} />
                    Add Income
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
