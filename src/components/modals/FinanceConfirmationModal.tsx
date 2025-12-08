import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  AlertTriangle,
  Receipt,
  CreditCard,
  Banknote,
  PiggyBank,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { cn, glass, rounded } from '../../utils/glass';
import type { PendingToolAction, FinanceToolArgs } from '../../contexts/FinanceToolsContext';

// ============================================
// Finance Confirmation Modal
// ============================================
// Shows a confirmation dialog for finance tool actions
// Displays what will happen and allows confirm/cancel
// Also handles multiple match selection

interface FinanceConfirmationModalProps {
  isOpen: boolean;
  pendingAction: PendingToolAction | null;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectMatch?: (matchId: string) => void;
  isProcessing?: boolean;
}

export function FinanceConfirmationModal({
  isOpen,
  pendingAction,
  onConfirm,
  onCancel,
  onSelectMatch,
  isProcessing = false,
}: FinanceConfirmationModalProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  if (!pendingAction) return null;

  // Check if this is a multiple match selection scenario
  const hasMultipleMatches = pendingAction.multipleMatches && pendingAction.multipleMatches.matches.length > 1;

  // Handle match selection
  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    onSelectMatch?.(matchId);
  };

  // Get icon and color based on action type
  const getActionStyle = () => {
    switch (pendingAction.toolName) {
      case 'log_expense':
        return { icon: Receipt, color: 'text-red-400', bgColor: 'bg-red-500/20' };
      case 'add_bill':
        return { icon: CreditCard, color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
      case 'add_debt':
        return { icon: Banknote, color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
      case 'pay_bill':
        return { icon: Check, color: 'text-green-400', bgColor: 'bg-green-500/20' };
      case 'pay_debt':
        return { icon: PiggyBank, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
      default:
        return { icon: Wallet, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    }
  };

  const { icon: Icon, color, bgColor } = getActionStyle();

  // Get action details for display
  const getActionDetails = () => {
    switch (pendingAction.toolName) {
      case 'log_expense': {
        const args = pendingAction.args as FinanceToolArgs['log_expense'];
        return {
          title: 'Log Expense',
          details: [
            { label: 'Amount', value: `₱${args.amount.toLocaleString()}` },
            { label: 'Description', value: args.description },
            { label: 'From', value: pendingAction.resolvedData?.allocation?.name || args.allocation_name },
          ],
        };
      }
      case 'add_bill': {
        const args = pendingAction.args as FinanceToolArgs['add_bill'];
        return {
          title: 'Add Bill/Subscription',
          details: [
            { label: 'Name', value: args.name },
            { label: 'Amount', value: `₱${args.amount.toLocaleString()}/month` },
            { label: 'Billing Day', value: `Day ${args.billing_day}` },
            { label: 'Category', value: args.category },
          ],
        };
      }
      case 'add_debt': {
        const args = pendingAction.args as FinanceToolArgs['add_debt'];
        return {
          title: 'Add Debt',
          details: [
            { label: 'Name', value: args.name },
            { label: 'Total Amount', value: `₱${args.total_amount.toLocaleString()}` },
            { label: 'Priority', value: args.priority },
            ...(args.due_date ? [{ label: 'Due Date', value: args.due_date }] : []),
          ],
        };
      }
      case 'pay_bill': {
        const args = pendingAction.args as FinanceToolArgs['pay_bill'];
        return {
          title: 'Pay Bill',
          details: [
            { label: 'Bill', value: pendingAction.resolvedData?.subscription?.name || args.bill_name },
            { label: 'Amount', value: `₱${(args.amount || 0).toLocaleString()}` },
            ...(args.note ? [{ label: 'Note', value: args.note }] : []),
          ],
        };
      }
      case 'pay_debt': {
        const args = pendingAction.args as FinanceToolArgs['pay_debt'];
        return {
          title: 'Pay Debt',
          details: [
            { label: 'Debt', value: pendingAction.resolvedData?.debt?.name || args.debt_name },
            { label: 'Payment', value: `₱${args.amount.toLocaleString()}` },
            ...(pendingAction.resolvedData?.debt ? [
              { label: 'Remaining After', value: `₱${Math.max(0, pendingAction.resolvedData.debt.remaining_amount - args.amount).toLocaleString()}` }
            ] : []),
          ],
        };
      }
      default:
        return { title: 'Confirm Action', details: [] };
    }
  };

  const { title, details } = getActionDetails();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]',
              'w-[90vw] max-w-[380px]',
              glass.modal,
              rounded.xl,
              'p-6',
              'border border-white/10'
            )}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className={cn(
                'absolute top-4 right-4',
                'p-1.5 rounded-full',
                'text-white/50 hover:text-white/80',
                'hover:bg-white/10',
                'transition-colors',
                'disabled:opacity-50'
              )}
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={cn('p-3 rounded-full', bgColor)}>
                <Icon size={28} className={color} />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-white text-center mb-2">
              {hasMultipleMatches ? 'Select an Item' : title}
            </h2>

            {/* Description */}
            <p className="text-white/60 text-sm text-center mb-4">
              {hasMultipleMatches 
                ? `Multiple ${pendingAction.multipleMatches?.type === 'bill' ? 'bills' : 'debts'} found - please select one`
                : pendingAction.description
              }
            </p>

            {/* Multiple Match Selection */}
            {hasMultipleMatches ? (
              <div className="mb-5 space-y-2 max-h-60 overflow-y-auto">
                {pendingAction.multipleMatches?.matches.map((match, index) => (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectMatch(match.id)}
                    className={cn(
                      'w-full p-3 rounded-lg',
                      'bg-white/5 hover:bg-white/10',
                      'border',
                      selectedMatchId === match.id 
                        ? 'border-emerald-500/50 bg-emerald-500/10' 
                        : 'border-white/10',
                      'flex items-center justify-between',
                      'transition-all duration-200'
                    )}
                  >
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{match.name}</p>
                      <p className="text-white/50 text-xs">
                        {match.amount !== undefined && `₱${match.amount.toLocaleString()}/month`}
                        {match.remaining !== undefined && `₱${match.remaining.toLocaleString()} remaining`}
                      </p>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={cn(
                        'text-white/30',
                        selectedMatchId === match.id && 'text-emerald-400'
                      )} 
                    />
                  </motion.button>
                ))}
              </div>
            ) : (
              /* Standard Details */
              <div className={cn(
                'mb-5 p-3 rounded-lg',
                'bg-black/20 border border-white/5'
              )}>
                {details.map((detail, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex justify-between items-center py-1.5',
                      index !== details.length - 1 && 'border-b border-white/5'
                    )}
                  >
                    <span className="text-white/50 text-sm">{detail.label}</span>
                    <span className="text-white font-medium text-sm">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warning for write operations (only show if not selecting) */}
            {!hasMultipleMatches && (
              <div className={cn(
                'mb-5 p-3 rounded-lg',
                'bg-amber-500/10 border border-amber-500/20',
                'flex items-start gap-2'
              )}>
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-200/80 text-xs">
                  This action will modify your financial data. Please confirm the details above are correct.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className={cn(
                  'flex-1 py-3 px-4 rounded-xl',
                  'bg-white/5 hover:bg-white/10',
                  'border border-white/10',
                  'text-white/70 hover:text-white',
                  'font-medium text-sm',
                  'transition-all',
                  'disabled:opacity-50'
                )}
              >
                Cancel
              </button>
              {/* Only show confirm button when not in selection mode, or when an item is selected */}
              {(!hasMultipleMatches || selectedMatchId) && (
                <button
                  onClick={onConfirm}
                  disabled={isProcessing || (hasMultipleMatches && !selectedMatchId)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-xl',
                    'bg-emerald-500/20 hover:bg-emerald-500/30',
                    'border border-emerald-500/30',
                    'text-emerald-300',
                    'font-medium text-sm',
                    'transition-all',
                    'disabled:opacity-50',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {hasMultipleMatches ? 'Select & Continue' : 'Confirm'}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
