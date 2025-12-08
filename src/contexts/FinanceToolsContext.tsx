import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useFinanceData } from './FinanceContext';
import type { 
  Subscription, 
  Debt, 
  Allocation,
  DebtPriority,
  SubscriptionCategory,
} from '../utils/financeTypes';

// ============================================
// Types for Finance Tool Actions
// ============================================

export type FinanceToolName = 
  | 'financial_forecast'
  | 'search_bills'
  | 'search_debts'
  | 'search_allocations'
  | 'log_expense'
  | 'add_bill'
  | 'add_debt'
  | 'pay_bill'
  | 'pay_debt';

export interface FinanceToolArgs {
  financial_forecast: {
    include_details?: boolean;
  };
  search_bills: {
    query?: string;
    category?: SubscriptionCategory;
    active_only?: boolean;
  };
  search_debts: {
    query?: string;
    priority?: DebtPriority;
  };
  search_allocations: {
    query?: string;
    category?: string;
  };
  log_expense: {
    amount: number;
    description: string;
    allocation_name?: string; // Optional - defaults to Living wallet
  };
  add_bill: {
    name: string;
    amount: number;
    billing_day: number;
    category: SubscriptionCategory;
  };
  add_debt: {
    name: string;
    total_amount: number;
    remaining_amount?: number;
    priority: DebtPriority;
    due_date?: string;
    notes?: string;
  };
  pay_bill: {
    bill_name: string;
    amount?: number;
    note?: string;
  };
  pay_debt: {
    debt_name: string;
    amount: number;
    note?: string;
  };
}

// Tools that require user confirmation before execution (shows modal)
export const CONFIRMATION_REQUIRED_TOOLS: FinanceToolName[] = [
  'log_expense',
  'add_bill',
  'add_debt',
  'pay_bill',
  'pay_debt',
];

export interface PendingToolAction<T extends FinanceToolName = FinanceToolName> {
  toolName: T;
  args: FinanceToolArgs[T];
  toolCallId: string;
  description: string; // Human-readable description of what will happen
  resolvedData?: {
    allocation?: Allocation;
    subscription?: Subscription;
    debt?: Debt;
  };
}

interface FinanceToolsContextType {
  // Pending confirmation state
  pendingAction: PendingToolAction | null;
  
  // Actions
  executeFinanceTool: <T extends FinanceToolName>(
    toolName: T,
    args: FinanceToolArgs[T],
    toolCallId: string
  ) => Promise<{ needsConfirmation: boolean; result?: string }>;
  
  confirmPendingAction: () => Promise<string>;
  cancelPendingAction: () => string;
  clearPendingAction: () => void;
}

const FinanceToolsContext = createContext<FinanceToolsContextType | null>(null);

export function useFinanceTools(): FinanceToolsContextType {
  const context = useContext(FinanceToolsContext);
  if (!context) {
    throw new Error('useFinanceTools must be used within a FinanceToolsProvider');
  }
  return context;
}

export function FinanceToolsProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<PendingToolAction | null>(null);
  
  const {
    // Data
    debts,
    subscriptions,
    allocations,
    activeSalaryDrop,
    dropSummary,
    walletStats,
    livingWallet,
    playWallet,
    // Actions
    createTransaction,
    createDebt,
    createSubscription,
    updateDebt,
  } = useFinanceData();

  // ============================================
  // Read-Only Tool Executors
  // ============================================

  const executeFinancialForecast = useCallback((args: FinanceToolArgs['financial_forecast']): string => {
    if (!activeSalaryDrop) {
      return JSON.stringify({
        error: false,
        message: "No active salary drop found. The user hasn't set up their current pay period yet.",
        data: {
          totalDebts: debts.reduce((sum, d) => sum + d.remaining_amount, 0),
          debtCount: debts.length,
          activeBills: subscriptions.filter(s => s.is_active).length,
        }
      });
    }

    const livingStats = livingWallet ? walletStats.get(livingWallet.id) : null;

    const summary = {
      activeDrop: {
        name: activeSalaryDrop.name,
        amount: activeSalaryDrop.amount,
        periodStart: activeSalaryDrop.period_start,
        periodEnd: activeSalaryDrop.period_end,
        daysRemaining: livingStats?.daysRemaining ?? 0,
      },
      budget: dropSummary ? {
        totalAllocated: dropSummary.totalAllocated,
        totalUnallocated: dropSummary.unallocated,
        totalBudget: activeSalaryDrop.amount,
      } : null,
      wallets: {
        living: livingWallet ? {
          name: livingWallet.name,
          balance: livingWallet.current_balance,
          totalBudget: livingWallet.total_budget,
          dailySafeSpend: livingStats?.dailySafeSpend ?? 0,
          isOnTrack: livingStats?.isOnTrack ?? true,
        } : null,
        play: playWallet ? {
          name: playWallet.name,
          balance: playWallet.current_balance,
          totalBudget: playWallet.total_budget,
        } : null,
      },
      debts: {
        count: debts.length,
        totalRemaining: debts.reduce((sum, d) => sum + d.remaining_amount, 0),
        critical: debts.filter(d => d.priority === 'critical').length,
      },
      bills: {
        activeCount: subscriptions.filter(s => s.is_active).length,
        totalMonthly: subscriptions.filter(s => s.is_active).reduce((sum, s) => sum + s.amount, 0),
      },
    };

    if (args.include_details) {
      return JSON.stringify({
        ...summary,
        details: {
          allAllocations: allocations.map(a => ({
            name: a.name,
            category: a.category,
            balance: a.current_balance,
            budget: a.total_budget,
          })),
          allDebts: debts.map(d => ({
            name: d.name,
            remaining: d.remaining_amount,
            total: d.total_amount,
            priority: d.priority,
            dueDate: d.due_date,
          })),
          allBills: subscriptions.filter(s => s.is_active).map(s => ({
            name: s.name,
            amount: s.amount,
            billingDay: s.billing_day,
            category: s.category,
          })),
        },
      });
    }

    return JSON.stringify(summary);
  }, [activeSalaryDrop, debts, subscriptions, allocations, dropSummary, walletStats, livingWallet, playWallet]);

  const executeSearchBills = useCallback((args: FinanceToolArgs['search_bills']): string => {
    let results = subscriptions;
    
    // Filter by active status (default true)
    if (args.active_only !== false) {
      results = results.filter(s => s.is_active);
    }
    
    // Filter by category
    if (args.category) {
      results = results.filter(s => s.category === args.category);
    }
    
    // Filter by query
    if (args.query) {
      const query = args.query.toLowerCase();
      results = results.filter(s => s.name.toLowerCase().includes(query));
    }

    return JSON.stringify({
      count: results.length,
      bills: results.map(s => ({
        name: s.name,
        amount: s.amount,
        billingDay: s.billing_day,
        category: s.category,
        isActive: s.is_active,
        endDate: s.end_on_date,
      })),
    });
  }, [subscriptions]);

  const executeSearchDebts = useCallback((args: FinanceToolArgs['search_debts']): string => {
    let results = debts;
    
    // Filter by priority
    if (args.priority) {
      results = results.filter(d => d.priority === args.priority);
    }
    
    // Filter by query
    if (args.query) {
      const query = args.query.toLowerCase();
      results = results.filter(d => d.name.toLowerCase().includes(query));
    }

    return JSON.stringify({
      count: results.length,
      totalRemaining: results.reduce((sum, d) => sum + d.remaining_amount, 0),
      debts: results.map(d => ({
        name: d.name,
        remaining: d.remaining_amount,
        total: d.total_amount,
        priority: d.priority,
        dueDate: d.due_date,
        notes: d.notes,
        percentPaid: Math.round((1 - d.remaining_amount / d.total_amount) * 100),
      })),
    });
  }, [debts]);

  const executeSearchAllocations = useCallback((args: FinanceToolArgs['search_allocations']): string => {
    let results = allocations;
    
    // Filter by category
    if (args.category) {
      results = results.filter(a => a.category === args.category);
    }
    
    // Filter by query
    if (args.query) {
      const query = args.query.toLowerCase();
      results = results.filter(a => a.name.toLowerCase().includes(query));
    }

    return JSON.stringify({
      count: results.length,
      totalBalance: results.reduce((sum, a) => sum + a.current_balance, 0),
      allocations: results.map(a => ({
        name: a.name,
        category: a.category,
        balance: a.current_balance,
        budget: a.total_budget,
        percentRemaining: Math.round((a.current_balance / a.total_budget) * 100),
      })),
    });
  }, [allocations]);

  // ============================================
  // Confirmation-Required Tool Preparers
  // ============================================

  const prepareLogExpense = useCallback((args: FinanceToolArgs['log_expense'], toolCallId: string): PendingToolAction => {
    // Default to Living wallet if not specified
    const allocationName = args.allocation_name || 'Living';
    const query = allocationName.toLowerCase();
    
    // Find the allocation by name (fuzzy match)
    let allocation = allocations.find(a => 
      a.name.toLowerCase().includes(query) || 
      a.category.toLowerCase().includes(query)
    );

    // If still not found and using default, try to get the primary living wallet
    if (!allocation && !args.allocation_name && livingWallet) {
      allocation = livingWallet;
    }

    return {
      toolName: 'log_expense',
      args: { ...args, allocation_name: allocation?.name || allocationName },
      toolCallId,
      description: `Log expense of ₱${args.amount.toLocaleString()} for "${args.description}" from ${allocation?.name || allocationName} wallet`,
      resolvedData: { allocation },
    };
  }, [allocations, livingWallet]);

  const prepareAddBill = useCallback((args: FinanceToolArgs['add_bill'], toolCallId: string): PendingToolAction => {
    return {
      toolName: 'add_bill',
      args,
      toolCallId,
      description: `Add new ${args.category} "${args.name}" for ₱${args.amount.toLocaleString()}/month on day ${args.billing_day}`,
    };
  }, []);

  const prepareAddDebt = useCallback((args: FinanceToolArgs['add_debt'], toolCallId: string): PendingToolAction => {
    return {
      toolName: 'add_debt',
      args,
      toolCallId,
      description: `Add new debt "${args.name}" for ₱${args.total_amount.toLocaleString()} with ${args.priority} priority`,
    };
  }, []);

  const preparePayBill = useCallback((args: FinanceToolArgs['pay_bill'], toolCallId: string): PendingToolAction => {
    // Find the subscription
    const query = args.bill_name.toLowerCase();
    const subscription = subscriptions.find(s => s.name.toLowerCase().includes(query));
    
    // Find the allocation linked to this subscription
    const allocation = subscription 
      ? allocations.find(a => a.linked_subscription_id === subscription.id)
      : allocations.find(a => a.name.toLowerCase().includes(query));

    const amount = args.amount || subscription?.amount || 0;

    return {
      toolName: 'pay_bill',
      args: { ...args, amount },
      toolCallId,
      description: `Pay bill "${subscription?.name || args.bill_name}" - ₱${amount.toLocaleString()}`,
      resolvedData: { subscription, allocation },
    };
  }, [subscriptions, allocations]);

  const preparePayDebt = useCallback((args: FinanceToolArgs['pay_debt'], toolCallId: string): PendingToolAction => {
    // Find the debt
    const query = args.debt_name.toLowerCase();
    const debt = debts.find(d => d.name.toLowerCase().includes(query));
    
    // Find the allocation linked to this debt
    const allocation = debt
      ? allocations.find(a => a.linked_debt_id === debt.id)
      : allocations.find(a => a.name.toLowerCase().includes(query));

    return {
      toolName: 'pay_debt',
      args,
      toolCallId,
      description: `Pay ₱${args.amount.toLocaleString()} towards debt "${debt?.name || args.debt_name}"`,
      resolvedData: { debt, allocation },
    };
  }, [debts, allocations]);

  // ============================================
  // Main Tool Executor
  // ============================================

  const executeFinanceTool = useCallback(async <T extends FinanceToolName>(
    toolName: T,
    args: FinanceToolArgs[T],
    toolCallId: string
  ): Promise<{ needsConfirmation: boolean; result?: string }> => {
    // Execute read-only tools immediately
    switch (toolName) {
      case 'financial_forecast':
        return { 
          needsConfirmation: false, 
          result: executeFinancialForecast(args as FinanceToolArgs['financial_forecast']) 
        };
      case 'search_bills':
        return { 
          needsConfirmation: false, 
          result: executeSearchBills(args as FinanceToolArgs['search_bills']) 
        };
      case 'search_debts':
        return { 
          needsConfirmation: false, 
          result: executeSearchDebts(args as FinanceToolArgs['search_debts']) 
        };
      case 'search_allocations':
        return { 
          needsConfirmation: false, 
          result: executeSearchAllocations(args as FinanceToolArgs['search_allocations']) 
        };
    }

    // Prepare write tools for confirmation (shows modal)
    let pendingAction: PendingToolAction;
    
    switch (toolName) {
      case 'log_expense':
        pendingAction = prepareLogExpense(args as FinanceToolArgs['log_expense'], toolCallId);
        break;
      case 'add_bill':
        pendingAction = prepareAddBill(args as FinanceToolArgs['add_bill'], toolCallId);
        break;
      case 'add_debt':
        pendingAction = prepareAddDebt(args as FinanceToolArgs['add_debt'], toolCallId);
        break;
      case 'pay_bill':
        pendingAction = preparePayBill(args as FinanceToolArgs['pay_bill'], toolCallId);
        break;
      case 'pay_debt':
        pendingAction = preparePayDebt(args as FinanceToolArgs['pay_debt'], toolCallId);
        break;
      default:
        return { 
          needsConfirmation: false, 
          result: JSON.stringify({ error: true, message: `Unknown tool: ${toolName}` }) 
        };
    }

    setPendingAction(pendingAction);
    return { needsConfirmation: true };
  }, [
    executeFinancialForecast,
    executeSearchBills,
    executeSearchDebts,
    executeSearchAllocations,
    prepareLogExpense,
    prepareAddBill,
    prepareAddDebt,
    preparePayBill,
    preparePayDebt,
  ]);

  // ============================================
  // Confirmation Executors
  // ============================================

  const executeLogExpense = useCallback(async (action: PendingToolAction): Promise<string> => {
    const args = action.args as FinanceToolArgs['log_expense'];
    const allocation = action.resolvedData?.allocation;

    if (!allocation) {
      return JSON.stringify({ 
        error: true, 
        message: `Could not find allocation "${args.allocation_name || 'Living'}". Please specify a valid wallet name.` 
      });
    }

    if (allocation.current_balance < args.amount) {
      return JSON.stringify({ 
        error: true, 
        message: `Insufficient balance in ${allocation.name}. Available: ₱${allocation.current_balance.toLocaleString()}, Requested: ₱${args.amount.toLocaleString()}` 
      });
    }

    await createTransaction({
      amount: args.amount,
      description: args.description,
      timestamp: new Date().toISOString(),
      allocation_id: allocation.id,
    });

    return JSON.stringify({
      success: true,
      message: `Logged expense of ₱${args.amount.toLocaleString()} for "${args.description}" from ${allocation.name}`,
      newBalance: allocation.current_balance - args.amount,
    });
  }, [createTransaction]);

  const executeAddBill = useCallback(async (action: PendingToolAction): Promise<string> => {
    const args = action.args as FinanceToolArgs['add_bill'];

    const newSub = await createSubscription({
      name: args.name,
      amount: args.amount,
      billing_day: args.billing_day,
      category: args.category,
      is_active: true,
    });

    return JSON.stringify({
      success: true,
      message: `Added new ${args.category} "${args.name}" for ₱${args.amount.toLocaleString()}/month`,
      subscription: newSub,
    });
  }, [createSubscription]);

  const executeAddDebt = useCallback(async (action: PendingToolAction): Promise<string> => {
    const args = action.args as FinanceToolArgs['add_debt'];

    const newDebt = await createDebt({
      name: args.name,
      total_amount: args.total_amount,
      remaining_amount: args.remaining_amount ?? args.total_amount,
      priority: args.priority,
      due_date: args.due_date,
      notes: args.notes,
    });

    return JSON.stringify({
      success: true,
      message: `Added new debt "${args.name}" for ₱${args.total_amount.toLocaleString()}`,
      debt: newDebt,
    });
  }, [createDebt]);

  const executePayBill = useCallback(async (action: PendingToolAction): Promise<string> => {
    const args = action.args as FinanceToolArgs['pay_bill'];
    const allocation = action.resolvedData?.allocation;
    const subscription = action.resolvedData?.subscription;

    if (!allocation) {
      return JSON.stringify({ 
        error: true, 
        message: `Could not find allocation for bill "${args.bill_name}". Create an allocation for this bill first.` 
      });
    }

    const amount = args.amount || subscription?.amount || 0;

    // Log the transaction
    await createTransaction({
      amount,
      description: args.note || `Payment for ${subscription?.name || args.bill_name}`,
      timestamp: new Date().toISOString(),
      allocation_id: allocation.id,
    });

    return JSON.stringify({
      success: true,
      message: `Paid ₱${amount.toLocaleString()} for ${subscription?.name || args.bill_name}`,
      newBalance: allocation.current_balance - amount,
    });
  }, [createTransaction]);

  const executePayDebt = useCallback(async (action: PendingToolAction): Promise<string> => {
    const args = action.args as FinanceToolArgs['pay_debt'];
    const debt = action.resolvedData?.debt;
    const allocation = action.resolvedData?.allocation;

    if (!debt) {
      return JSON.stringify({ 
        error: true, 
        message: `Could not find debt "${args.debt_name}". Check the debt name and try again.` 
      });
    }

    // Update debt remaining amount
    const newRemaining = Math.max(0, debt.remaining_amount - args.amount);
    await updateDebt(debt.id, { remaining_amount: newRemaining });

    // If there's a linked allocation, log the transaction
    if (allocation) {
      await createTransaction({
        amount: args.amount,
        description: args.note || `Debt payment for ${debt.name}`,
        timestamp: new Date().toISOString(),
        allocation_id: allocation.id,
      });
    }

    return JSON.stringify({
      success: true,
      message: `Paid ₱${args.amount.toLocaleString()} towards ${debt.name}. Remaining: ₱${newRemaining.toLocaleString()}`,
      newRemaining,
      isPaidOff: newRemaining === 0,
    });
  }, [updateDebt, createTransaction]);

  const confirmPendingAction = useCallback(async (): Promise<string> => {
    if (!pendingAction) {
      return JSON.stringify({ error: true, message: 'No pending action to confirm' });
    }

    let result: string;

    try {
      switch (pendingAction.toolName) {
        case 'log_expense':
          result = await executeLogExpense(pendingAction);
          break;
        case 'add_bill':
          result = await executeAddBill(pendingAction);
          break;
        case 'add_debt':
          result = await executeAddDebt(pendingAction);
          break;
        case 'pay_bill':
          result = await executePayBill(pendingAction);
          break;
        case 'pay_debt':
          result = await executePayDebt(pendingAction);
          break;
        default:
          result = JSON.stringify({ error: true, message: 'Unknown action type' });
      }
    } catch (err) {
      result = JSON.stringify({ 
        error: true, 
        message: err instanceof Error ? err.message : 'Failed to execute action' 
      });
    }

    setPendingAction(null);
    return result;
  }, [pendingAction, executeLogExpense, executeAddBill, executeAddDebt, executePayBill, executePayDebt]);

  const cancelPendingAction = useCallback((): string => {
    const action = pendingAction;
    setPendingAction(null);
    return JSON.stringify({ 
      cancelled: true, 
      message: action ? `Action cancelled: ${action.description}` : 'No action to cancel' 
    });
  }, [pendingAction]);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return (
    <FinanceToolsContext.Provider value={{
      pendingAction,
      executeFinanceTool,
      confirmPendingAction,
      cancelPendingAction,
      clearPendingAction,
    }}>
      {children}
    </FinanceToolsContext.Provider>
  );
}
