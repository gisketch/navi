import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceData } from '../contexts/FinanceContext';
import { cn, rounded, glass } from '../utils/glass';
import {
  ChevronDown,
  Receipt,
  CreditCard,
  Banknote,
  Wallet,
  Droplets,
  FileText,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Zap,
  Home,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { 
  Transaction, 
  Debt, 
  Subscription, 
  Allocation, 
  MoneyDrop, 
  BudgetTemplate 
} from '../utils/financeTypes';

type LogType = 'transactions' | 'debts' | 'subscriptions' | 'allocations' | 'money_drops' | 'budget_templates';

interface LogsProps {
  naviPosition?: { x: number; y: number };
  onEditDebt?: (debt: Debt) => void;
  onEditSubscription?: (subscription: Subscription) => void;
  onEditAllocation?: (allocation: Allocation) => void;
  onEditMoneyDrop?: (drop: MoneyDrop) => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

const LOG_TYPES: { id: LogType; label: string; icon: typeof Receipt }[] = [
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'debts', label: 'Debts', icon: CreditCard },
  { id: 'subscriptions', label: 'Bills', icon: Banknote },
  { id: 'allocations', label: 'Allocations', icon: Wallet },
  { id: 'money_drops', label: 'Money Drops', icon: Droplets },
  { id: 'budget_templates', label: 'Templates', icon: FileText },
];

const PRIORITY_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
  high: { icon: ArrowUp, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  medium: { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  low: { icon: ArrowDown, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

const CATEGORY_CONFIG = {
  subscription: { icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  utility: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  rent: { icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

// ============================================
// Transaction Card
// ============================================
function TransactionCard({ 
  transaction, 
  allocation,
  onClick 
}: { 
  transaction: Transaction; 
  allocation?: Allocation;
  onClick?: () => void;
}) {
  const date = new Date(transaction.timestamp);
  const isExpense = transaction.type === 'expense';
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left',
        rounded.lg,
        glass.card,
        'hover:bg-white/[0.06] transition-colors'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isExpense ? 'bg-red-500/20' : 'bg-emerald-500/20'
          )}>
            {isExpense ? (
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <p className="text-white font-medium">{transaction.description}</p>
            <p className="text-white/40 text-sm">
              {allocation?.name || 'Unknown'} • {date.toLocaleDateString()}
            </p>
          </div>
        </div>
        <p className={cn(
          'font-semibold',
          isExpense ? 'text-red-400' : 'text-emerald-400'
        )}>
          {isExpense ? '-' : '+'}₱{transaction.amount.toLocaleString()}
        </p>
      </div>
    </motion.button>
  );
}

// ============================================
// Debt Card
// ============================================
function DebtCard({ 
  debt, 
  onClick 
}: { 
  debt: Debt; 
  onClick?: () => void;
}) {
  const config = PRIORITY_CONFIG[debt.priority];
  const Icon = config.icon;
  const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left',
        rounded.lg,
        glass.card,
        'hover:bg-white/[0.06] transition-colors'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            config.bg
          )}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <p className="text-white font-medium">{debt.name}</p>
            {debt.due_date && (
              <p className="text-white/40 text-sm flex items-center gap-1">
                <Calendar size={12} />
                Due: {new Date(debt.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold">₱{debt.remaining_amount.toLocaleString()}</p>
          <p className="text-white/30 text-sm">of ₱{debt.total_amount.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn('h-full rounded-full', config.bg.replace('/20', '/50'))}
        />
      </div>
    </motion.button>
  );
}

// ============================================
// Subscription Card
// ============================================
function SubscriptionCard({ 
  subscription, 
  onClick 
}: { 
  subscription: Subscription; 
  onClick?: () => void;
}) {
  const config = CATEGORY_CONFIG[subscription.category];
  const Icon = config.icon;
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left',
        rounded.lg,
        glass.card,
        'hover:bg-white/[0.06] transition-colors',
        !subscription.is_active && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            config.bg
          )}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <p className="text-white font-medium">{subscription.name}</p>
            <p className="text-white/40 text-sm flex items-center gap-1">
              <Calendar size={12} />
              Day {subscription.billing_day} of month
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold">₱{subscription.amount.toLocaleString()}</p>
          <div className="flex items-center gap-1 justify-end">
            {subscription.is_active ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <XCircle size={12} className="text-white/30" />
            )}
            <span className={cn(
              'text-sm',
              subscription.is_active ? 'text-emerald-400' : 'text-white/30'
            )}>
              {subscription.is_active ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================
// Allocation Card
// ============================================
function AllocationCard({ 
  allocation,
  onClick 
}: { 
  allocation: Allocation; 
  onClick?: () => void;
}) {
  const progress = (allocation.current_balance / allocation.total_budget) * 100;
  const isLow = progress < 20;
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left',
        rounded.lg,
        glass.card,
        'hover:bg-white/[0.06] transition-colors'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            'bg-cyan-500/20'
          )}>
            <Wallet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-medium">{allocation.name}</p>
            <p className="text-white/40 text-sm capitalize">{allocation.category}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            'font-semibold',
            isLow ? 'text-red-400' : 'text-white'
          )}>
            ₱{allocation.current_balance.toLocaleString()}
          </p>
          <p className="text-white/30 text-sm">of ₱{allocation.total_budget.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className={cn(
            'h-full rounded-full',
            isLow ? 'bg-red-500/50' : 'bg-cyan-500/50'
          )}
        />
      </div>
    </motion.button>
  );
}

// ============================================
// Money Drop Card
// ============================================
function MoneyDropCard({ 
  drop,
  onClick 
}: { 
  drop: MoneyDrop; 
  onClick?: () => void;
}) {
  const isSalary = drop.type === 'salary';
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left',
        rounded.lg,
        glass.card,
        'hover:bg-white/[0.06] transition-colors'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isSalary ? 'bg-emerald-500/20' : 'bg-purple-500/20'
          )}>
            <Droplets className={cn(
              'w-5 h-5',
              isSalary ? 'text-emerald-400' : 'text-purple-400'
            )} />
          </div>
          <div>
            <p className="text-white font-medium">{drop.name}</p>
            <p className="text-white/40 text-sm">
              {new Date(drop.date).toLocaleDateString()}
              {drop.period_start && drop.period_end && (
                <> • {new Date(drop.period_start).toLocaleDateString()} - {new Date(drop.period_end).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            'font-semibold',
            isSalary ? 'text-emerald-400' : 'text-purple-400'
          )}>
            ₱{drop.amount.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 justify-end">
            {drop.is_received ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <XCircle size={12} className="text-white/30" />
            )}
            <span className={cn(
              'text-sm capitalize',
              drop.is_received ? 'text-emerald-400' : 'text-white/30'
            )}>
              {drop.is_received ? 'Received' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================
// Budget Template Card
// ============================================
function BudgetTemplateCard({ 
  template 
}: { 
  template: BudgetTemplate;
}) {
  const totalPercent = Object.values(template.allocation_rules).reduce((sum, val) => sum + val, 0);
  
  return (
    <motion.div
      className={cn(
        'w-full p-4',
        rounded.lg,
        glass.card
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium">{template.name}</p>
            <p className="text-white/40 text-sm">{Object.keys(template.allocation_rules).length} allocations</p>
          </div>
        </div>
        <p className={cn(
          'text-sm font-medium',
          totalPercent === 100 ? 'text-emerald-400' : 'text-yellow-400'
        )}>
          {totalPercent}%
        </p>
      </div>
      
      {/* Allocation breakdown */}
      <div className="space-y-1">
        {Object.entries(template.allocation_rules).map(([name, percent]) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-white/50">{name}</span>
            <span className="text-white/70">{percent}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// Logs Page Component
// ============================================
export function Logs({
  onEditDebt,
  onEditSubscription,
  onEditAllocation,
  onEditMoneyDrop,
  onEditTransaction,
}: LogsProps) {
  const [selectedType, setSelectedType] = useState<LogType>('transactions');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const {
    transactions,
    debts,
    subscriptions,
    allocations,
    moneyDrops,
    budgetTemplates,
    isLoading,
  } = useFinanceData();

  const selectedConfig = LOG_TYPES.find(t => t.id === selectedType)!;
  const Icon = selectedConfig.icon;

  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    [transactions]
  );

  // Sort money drops by date (newest first)
  const sortedMoneyDrops = useMemo(() => 
    [...moneyDrops].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [moneyDrops]
  );

  // Get allocation by ID helper
  const getAllocationById = (id: string) => allocations.find(a => a.id === id);

  return (
    <div className="min-h-full pb-32">
      {/* Header */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-white mb-1">Logs</h1>
        <p className="text-white/40 text-sm">View and manage your finance data</p>
      </div>

      {/* Dropdown Selector */}
      <div className="px-4 mb-4">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              'w-full p-4 flex items-center justify-between',
              rounded.xl,
              glass.card,
              'hover:bg-white/[0.06] transition-colors'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-cyan-500/20'
              )}>
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-white font-medium">{selectedConfig.label}</span>
            </div>
            <motion.div
              animate={{ rotate: showDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-white/50" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={cn(
                  'absolute top-full left-0 right-0 mt-2 z-30',
                  rounded.xl,
                  'bg-slate-900/95 border border-white/10',
                  'shadow-xl backdrop-blur-xl overflow-hidden'
                )}
              >
                {LOG_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.id);
                        setShowDropdown(false);
                      }}
                      className={cn(
                        'w-full p-3 flex items-center gap-3',
                        'hover:bg-white/5 transition-colors',
                        isSelected && 'bg-cyan-500/10'
                      )}
                    >
                      <TypeIcon className={cn(
                        'w-5 h-5',
                        isSelected ? 'text-cyan-400' : 'text-white/40'
                      )} />
                      <span className={cn(
                        isSelected ? 'text-cyan-400' : 'text-white/70'
                      )}>{type.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40">Loading...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Transactions */}
              {selectedType === 'transactions' && (
                sortedTransactions.length === 0 ? (
                  <EmptyState message="No transactions yet" />
                ) : (
                  sortedTransactions.map(tx => (
                    <TransactionCard 
                      key={tx.id} 
                      transaction={tx} 
                      allocation={getAllocationById(tx.allocation_id)}
                      onClick={() => onEditTransaction?.(tx)}
                    />
                  ))
                )
              )}

              {/* Debts */}
              {selectedType === 'debts' && (
                debts.length === 0 ? (
                  <EmptyState message="No debts recorded" />
                ) : (
                  debts.map(debt => (
                    <DebtCard 
                      key={debt.id} 
                      debt={debt} 
                      onClick={() => onEditDebt?.(debt)}
                    />
                  ))
                )
              )}

              {/* Subscriptions */}
              {selectedType === 'subscriptions' && (
                subscriptions.length === 0 ? (
                  <EmptyState message="No bills or subscriptions" />
                ) : (
                  subscriptions.map(sub => (
                    <SubscriptionCard 
                      key={sub.id} 
                      subscription={sub} 
                      onClick={() => onEditSubscription?.(sub)}
                    />
                  ))
                )
              )}

              {/* Allocations */}
              {selectedType === 'allocations' && (
                allocations.length === 0 ? (
                  <EmptyState message="No allocations created" />
                ) : (
                  allocations.map(alloc => (
                    <AllocationCard 
                      key={alloc.id} 
                      allocation={alloc} 
                      onClick={() => onEditAllocation?.(alloc)}
                    />
                  ))
                )
              )}

              {/* Money Drops */}
              {selectedType === 'money_drops' && (
                sortedMoneyDrops.length === 0 ? (
                  <EmptyState message="No money drops yet" />
                ) : (
                  sortedMoneyDrops.map(drop => (
                    <MoneyDropCard 
                      key={drop.id} 
                      drop={drop} 
                      onClick={() => onEditMoneyDrop?.(drop)}
                    />
                  ))
                )
              )}

              {/* Budget Templates */}
              {selectedType === 'budget_templates' && (
                budgetTemplates.length === 0 ? (
                  <EmptyState message="No budget templates" />
                ) : (
                  budgetTemplates.map(template => (
                    <BudgetTemplateCard key={template.id} template={template} />
                  ))
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className={cn(
      'py-12 text-center',
      rounded.xl,
      glass.card
    )}>
      <p className="text-white/40">{message}</p>
    </div>
  );
}
