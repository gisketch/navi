import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Calendar,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn, rounded, glass } from '../utils/glass';

interface DebtInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DebtData) => Promise<void>;
}

export interface DebtData {
  name: string;
  total_amount: number;
  remaining_amount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date?: string;
  notes?: string;
}

const PRIORITY_OPTIONS = [
  { id: 'critical', label: 'Critical', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  { id: 'high', label: 'High', icon: ArrowUp, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { id: 'medium', label: 'Medium', icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { id: 'low', label: 'Low', icon: ArrowDown, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
] as const;

export function DebtInputModal({
  isOpen,
  onClose,
  onSubmit,
}: DebtInputModalProps) {
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
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
      setTotalAmount('');
      setRemainingAmount('');
      setPriority('medium');
      setDueDate('');
      setNotes('');
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Sync remaining with total if remaining is empty
  useEffect(() => {
    if (totalAmount && !remainingAmount) {
      setRemainingAmount(totalAmount);
    }
  }, [totalAmount, remainingAmount]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    const total = parseFloat(totalAmount);
    if (!total || total <= 0) {
      setError('Please enter a valid total amount');
      return;
    }

    const remaining = parseFloat(remainingAmount) || total;
    if (remaining < 0 || remaining > total) {
      setError('Remaining amount must be between 0 and total');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        total_amount: total,
        remaining_amount: remaining,
        priority,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to create debt');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, totalAmount, remainingAmount, priority, dueDate, notes, onSubmit, onClose]);

  const selectedPriorityConfig = PRIORITY_OPTIONS.find(p => p.id === priority)!;

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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
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
                  background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5), transparent)',
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
                  <h2 className="text-lg font-semibold text-white">Add Debt</h2>
                  <p className="text-sm text-white/40">Track money you owe</p>
                </div>

                {/* Name Input */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Name</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Mom loan, Credit card"
                    className={cn(
                      'w-full p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'text-white placeholder-white/20 outline-none',
                      'focus:border-cyan-400/50 transition-colors'
                    )}
                  />
                </div>

                {/* Amount Inputs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Total Amount</label>
                    <div className={cn(
                      'flex items-center gap-2 p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus-within:border-cyan-400/50 transition-colors'
                    )}>
                      <span className="text-white/30">₱</span>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-white placeholder-white/20 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Remaining</label>
                    <div className={cn(
                      'flex items-center gap-2 p-3',
                      rounded.lg,
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus-within:border-cyan-400/50 transition-colors'
                    )}>
                      <span className="text-white/30">₱</span>
                      <input
                        type="number"
                        value={remainingAmount}
                        onChange={(e) => setRemainingAmount(e.target.value)}
                        placeholder={totalAmount || '0'}
                        className="flex-1 bg-transparent text-white placeholder-white/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = priority === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setPriority(opt.id)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                            isSelected
                              ? `${opt.bg} ${opt.border} border`
                              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
                          )}
                        >
                          <Icon size={16} className={isSelected ? opt.color : 'text-white/40'} />
                          <span className={cn(
                            'text-xs',
                            isSelected ? opt.color : 'text-white/40'
                          )}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date (Optional) */}
                <div className="mb-4">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    Due Date <span className="text-white/20">(optional)</span>
                  </label>
                  <div className={cn(
                    'flex items-center gap-2 p-3',
                    rounded.lg,
                    'bg-white/[0.05] border border-white/[0.08]',
                    'focus-within:border-cyan-400/50 transition-colors'
                  )}>
                    <Calendar size={16} className="text-white/30" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 bg-transparent text-white outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Notes (Optional) */}
                <div className="mb-5">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    Notes <span className="text-white/20">(optional)</span>
                  </label>
                  <div className={cn(
                    'flex items-start gap-2 p-3',
                    rounded.lg,
                    'bg-white/[0.05] border border-white/[0.08]',
                    'focus-within:border-cyan-400/50 transition-colors'
                  )}>
                    <FileText size={16} className="text-white/30 mt-0.5" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional details..."
                      rows={2}
                      className="flex-1 bg-transparent text-white placeholder-white/20 outline-none resize-none"
                    />
                  </div>
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
                  disabled={!name || !totalAmount || isSubmitting}
                  className={cn(
                    'w-full py-4 rounded-xl font-medium transition-all',
                    'flex items-center justify-center gap-2',
                    name && totalAmount && !isSubmitting
                      ? `${selectedPriorityConfig.bg} ${selectedPriorityConfig.color} border ${selectedPriorityConfig.border} hover:brightness-110`
                      : 'bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Add Debt
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
