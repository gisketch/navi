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
  Droplets,
  ChevronDown,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { MoneyDrop, Subscription } from '../../utils/financeTypes';

interface SubscriptionInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  activeDrops?: MoneyDrop[];
  editData?: Subscription | null;
}

export interface SubscriptionData {
  id?: string;
  name: string;
  amount: number;
  billing_day: number;
  category: 'subscription' | 'utility' | 'rent';
  is_active: boolean;
  end_on_date?: string | null; // null means recurring indefinitely
  // Optional: link to money drop (creates allocation)
  money_drop_id?: string;
  create_allocation?: boolean;
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
  onDelete,
  activeDrops = [],
  editData,
}: SubscriptionInputModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [category, setCategory] = useState<'subscription' | 'utility' | 'rent'>('subscription');
  const [isActive, setIsActive] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endOnDate, setEndOnDate] = useState('');
  const [selectedDropId, setSelectedDropId] = useState<string>('');
  const [createAllocation, setCreateAllocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!editData;

  // Auto-focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameRef.current && !isEditMode) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [isOpen, isEditMode]);

  // Reset or prefill state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // Edit mode - prefill data
        setName(editData.name);
        setAmount(String(editData.amount));
        setBillingDay(String(editData.billing_day));
        setCategory(editData.category);
        setIsActive(editData.is_active);
        setHasEndDate(!!editData.end_on_date);
        setEndOnDate(editData.end_on_date || '');
        setSelectedDropId('');
        setCreateAllocation(false);
      } else {
        // Create mode - reset
        setName('');
        setAmount('');
        setBillingDay('1');
        setCategory('subscription');
        setIsActive(true);
        setHasEndDate(false);
        setEndOnDate('');
        setSelectedDropId('');
        setCreateAllocation(false);
      }
      setError(null);
      setShowSuccess(false);
      setShowDropdown(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editData]);

  const selectedDrop = activeDrops.find(d => d.id === selectedDropId);

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
        id: editData?.id,
        name: name.trim(),
        amount: amountNum,
        billing_day: day,
        category,
        is_active: isActive,
        end_on_date: hasEndDate && endOnDate ? endOnDate : undefined,
        money_drop_id: selectedDropId || undefined,
        create_allocation: createAllocation && !!selectedDropId,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(isEditMode ? 'Failed to update subscription' : 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, amount, billingDay, category, isActive, hasEndDate, endOnDate, selectedDropId, createAllocation, onSubmit, onClose, editData, isEditMode]);

  const handleDelete = useCallback(async () => {
    if (!editData?.id || !onDelete) return;
    
    setIsSubmitting(true);
    try {
      await onDelete(editData.id);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to delete subscription');
    } finally {
      setIsSubmitting(false);
    }
  }, [editData, onDelete, onClose]);

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

              {/* Delete Confirm overlay */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6"
                  >
                    <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
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

              <div className="p-5">
                {/* Header */}
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-white">{isEditMode ? 'Edit Bill' : 'Add Bill'}</h2>
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

                {/* Money Drop Link (Optional) - Only show in create mode */}
                {!isEditMode && activeDrops.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                      Link to Money Drop <span className="text-white/20">(optional)</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={cn(
                          'w-full p-3 flex items-center justify-between',
                          rounded.lg,
                          'bg-white/[0.05] border border-white/[0.08]',
                          'hover:border-cyan-400/30 transition-colors',
                          selectedDropId && 'border-cyan-400/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Droplets size={16} className={selectedDrop ? 'text-cyan-400' : 'text-white/30'} />
                          <span className={selectedDrop ? 'text-white' : 'text-white/40'}>
                            {selectedDrop ? selectedDrop.name : 'None (standalone bill)'}
                          </span>
                        </div>
                        <ChevronDown size={16} className="text-white/30" />
                      </button>
                      
                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              'absolute top-full left-0 right-0 mt-2 z-30',
                              rounded.lg,
                              'bg-slate-900/95 border border-white/10',
                              'shadow-xl backdrop-blur-xl',
                              'max-h-48 overflow-y-auto'
                            )}
                          >
                            <button
                              onClick={() => {
                                setSelectedDropId('');
                                setCreateAllocation(false);
                                setShowDropdown(false);
                              }}
                              className={cn(
                                'w-full p-3 text-left flex items-center gap-2',
                                'hover:bg-white/5 transition-colors',
                                !selectedDropId && 'bg-white/5'
                              )}
                            >
                              <span className="text-white/50">None (standalone)</span>
                            </button>
                            {activeDrops.map((drop) => (
                              <button
                                key={drop.id}
                                onClick={() => {
                                  setSelectedDropId(drop.id);
                                  setShowDropdown(false);
                                }}
                                className={cn(
                                  'w-full p-3 text-left flex items-center gap-2',
                                  'hover:bg-white/5 transition-colors',
                                  selectedDropId === drop.id && 'bg-cyan-400/10'
                                )}
                              >
                                <Droplets size={14} className="text-cyan-400" />
                                <span className="text-white">{drop.name}</span>
                                <span className="text-white/30 text-sm ml-auto">
                                  ₱{drop.amount.toLocaleString()}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Create Allocation Toggle */}
                    {selectedDropId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <button
                          onClick={() => setCreateAllocation(!createAllocation)}
                          className={cn(
                            'w-full p-3 rounded-xl transition-all flex items-center justify-between',
                            createAllocation
                              ? 'bg-cyan-500/20 border border-cyan-500/30'
                              : 'bg-white/[0.03] border border-white/[0.06]'
                          )}
                        >
                          <span className={createAllocation ? 'text-cyan-400' : 'text-white/40'}>
                            Create allocation from this money drop
                          </span>
                          <div className={cn(
                            'w-10 h-6 rounded-full transition-colors relative',
                            createAllocation ? 'bg-cyan-500/30' : 'bg-white/10'
                          )}>
                            <motion.div
                              animate={{ x: createAllocation ? 18 : 2 }}
                              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                              className={cn(
                                'absolute top-1 w-4 h-4 rounded-full',
                                createAllocation ? 'bg-cyan-400' : 'bg-white/40'
                              )}
                            />
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Active Toggle */}
                <div className="mb-4">
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

                {/* End Date Toggle */}
                <div className="mb-5">
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    End Date <span className="text-white/20">(optional)</span>
                  </label>
                  <button
                    onClick={() => setHasEndDate(!hasEndDate)}
                    className={cn(
                      'w-full p-3 rounded-xl transition-all flex items-center justify-between',
                      hasEndDate
                        ? 'bg-amber-500/20 border border-amber-500/30'
                        : 'bg-white/[0.03] border border-white/[0.06]'
                    )}
                  >
                    <span className={hasEndDate ? 'text-amber-400' : 'text-white/40'}>
                      {hasEndDate ? 'Has End Date' : 'Recurring Indefinitely'}
                    </span>
                    <div className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      hasEndDate ? 'bg-amber-500/30' : 'bg-white/10'
                    )}>
                      <motion.div
                        animate={{ x: hasEndDate ? 18 : 2 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full',
                          hasEndDate ? 'bg-amber-400' : 'bg-white/40'
                        )}
                      />
                    </div>
                  </button>
                  
                  {/* Date Input when enabled */}
                  <AnimatePresence>
                    {hasEndDate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <input
                          type="date"
                          value={endOnDate}
                          onChange={(e) => setEndOnDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className={cn(
                            'w-full p-3',
                            rounded.lg,
                            'bg-white/[0.05] border border-white/[0.08]',
                            'text-white outline-none',
                            'focus:border-amber-400/50 transition-colors',
                            '[color-scheme:dark]'
                          )}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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

                {/* Action Buttons */}
                <div className="space-y-3">
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
                        {isEditMode ? 'Update' : 'Add'} {selectedCategoryConfig.label}
                      </>
                    )}
                  </motion.button>

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
                      Delete Bill
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
