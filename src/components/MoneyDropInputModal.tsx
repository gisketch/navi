import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Wallet,
  Gift,
  Calendar,
  Check,
  AlertCircle,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';
import type { MoneyDropType, BudgetTemplate } from '../utils/financeTypes';

interface MoneyDropInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MoneyDropData) => void | Promise<void>;
  budgetTemplates?: BudgetTemplate[];
}

export interface MoneyDropData {
  name: string;
  amount: number;
  date: string;
  is_received: boolean;
  type: MoneyDropType;
  period_start?: string;
  period_end?: string;
  template_id?: string; // For auto-creating allocations from template
}

export function MoneyDropInputModal({
  isOpen,
  onClose,
  onSubmit,
  budgetTemplates = [],
}: MoneyDropInputModalProps) {
  // Form state
  const [dropType, setDropType] = useState<MoneyDropType>('salary');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isReceived, setIsReceived] = useState(true);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDropType('salary');
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsReceived(true);
      setPeriodStart('');
      setPeriodEnd('');
      setSelectedTemplate(budgetTemplates[0]?.id || null);
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen, budgetTemplates]);

  // Auto-set period dates for salary drops
  useEffect(() => {
    if (dropType === 'salary' && date && !periodStart) {
      // Default: 2-week period starting from date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 13); // 14 days total
      
      setPeriodStart(startDate.toISOString().split('T')[0]);
      setPeriodEnd(endDate.toISOString().split('T')[0]);
    }
  }, [dropType, date, periodStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (dropType === 'salary') {
      if (!periodStart || !periodEnd) {
        setError('Please set the period dates');
        return;
      }
      if (new Date(periodEnd) <= new Date(periodStart)) {
        setError('End date must be after start date');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const data: MoneyDropData = {
        name: name.trim(),
        amount: amountNum,
        date,
        is_received: isReceived,
        type: dropType,
      };

      if (dropType === 'salary') {
        data.period_start = periodStart;
        data.period_end = periodEnd;
        if (selectedTemplate) {
          data.template_id = selectedTemplate;
        }
      }

      await onSubmit(data);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create money drop');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency input
  const formatAmount = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return amount;
    if (parts[1]?.length > 2) return amount;
    return cleaned;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-md',
              'mx-4 mb-4 sm:mb-0',
              glass.card,
              rounded.xl,
              'p-6',
              'border border-white/10'
            )}
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm rounded-xl z-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                  >
                    <Check className="w-16 h-16 text-emerald-400" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">New Money Drop</h2>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 -mr-2',
                  rounded.lg,
                  'text-white/50 hover:text-white hover:bg-white/10',
                  'transition-colors'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Drop Type Toggle */}
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDropType('salary')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all',
                    dropType === 'salary'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-white/60 hover:text-white/80'
                  )}
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">Salary</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDropType('extra')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all',
                    dropType === 'extra'
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'text-white/60 hover:text-white/80'
                  )}
                >
                  <Gift className="w-4 h-4" />
                  <span className="font-medium">Extra</span>
                </button>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={dropType === 'salary' ? 'December Salary' : 'Holiday Bonus'}
                  className={cn(
                    'w-full px-4 py-3',
                    'bg-white/5 border border-white/10',
                    rounded.lg,
                    'text-white placeholder-white/30',
                    'focus:outline-none focus:border-white/30',
                    'transition-colors'
                  )}
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    placeholder="0.00"
                    className={cn(
                      'w-full pl-10 pr-4 py-3',
                      'bg-white/5 border border-white/10',
                      rounded.lg,
                      'text-white text-xl font-medium placeholder-white/30',
                      'focus:outline-none focus:border-white/30',
                      'transition-colors'
                    )}
                  />
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  {isReceived ? 'Date Received' : 'Expected Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(
                      'w-full pl-11 pr-4 py-3',
                      'bg-white/5 border border-white/10',
                      rounded.lg,
                      'text-white',
                      'focus:outline-none focus:border-white/30',
                      'transition-colors',
                      '[color-scheme:dark]'
                    )}
                  />
                </div>
              </div>

              {/* Received Toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-white/60">Already received?</span>
                <button
                  type="button"
                  onClick={() => setIsReceived(!isReceived)}
                  className={cn(
                    'w-12 h-7 rounded-full transition-all relative',
                    isReceived ? 'bg-emerald-500' : 'bg-white/10'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform',
                      isReceived ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Period Dates (Salary only) */}
              {dropType === 'salary' && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <p className="text-sm text-white/60">Pay Period</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Start</label>
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className={cn(
                          'w-full px-3 py-2',
                          'bg-white/5 border border-white/10',
                          rounded.lg,
                          'text-white text-sm',
                          'focus:outline-none focus:border-white/30',
                          '[color-scheme:dark]'
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">End</label>
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className={cn(
                          'w-full px-3 py-2',
                          'bg-white/5 border border-white/10',
                          rounded.lg,
                          'text-white text-sm',
                          'focus:outline-none focus:border-white/30',
                          '[color-scheme:dark]'
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Budget Template (Salary only) */}
              {dropType === 'salary' && budgetTemplates.length > 0 && (
                <div className="pt-2">
                  <label className="block text-sm text-white/60 mb-2">Apply Template</label>
                  <div className="space-y-2">
                    {budgetTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(
                          selectedTemplate === template.id ? null : template.id
                        )}
                        className={cn(
                          'w-full flex items-center justify-between p-3',
                          'bg-white/5 border',
                          rounded.lg,
                          'transition-all',
                          selectedTemplate === template.id
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-white/10 hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Wallet className={cn(
                            'w-5 h-5',
                            selectedTemplate === template.id ? 'text-emerald-400' : 'text-white/40'
                          )} />
                          <div className="text-left">
                            <p className={cn(
                              'font-medium',
                              selectedTemplate === template.id ? 'text-emerald-400' : 'text-white'
                            )}>
                              {template.name}
                            </p>
                            <p className="text-xs text-white/40">
                              {template.allocation_rules.length} allocations
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          'w-4 h-4',
                          selectedTemplate === template.id ? 'text-emerald-400' : 'text-white/20'
                        )} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-400">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !amount}
                className={cn(
                  'w-full py-4 mt-2',
                  rounded.lg,
                  'font-semibold text-white',
                  'transition-all',
                  dropType === 'salary'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-lg',
                  dropType === 'salary' ? 'shadow-emerald-500/20' : 'shadow-violet-500/20'
                )}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                  />
                ) : (
                  `Create ${dropType === 'salary' ? 'Salary' : 'Extra'} Drop`
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
