import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type {
  MoneyDrop,
  Debt,
  Subscription,
  Allocation,
  AllocationRaw,
  Transaction,
  BudgetTemplate,
  WalletStats,
  ActiveDropSummary,
  DailySpendData,
  MissionItem,
} from '../utils/financeTypes';
import {
  USE_MOCK_DATA,
  MOCK_MONEY_DROPS,
  MOCK_DEBTS,
  MOCK_SUBSCRIPTIONS,
  MOCK_ALLOCATIONS,
  MOCK_TRANSACTIONS,
  MOCK_BUDGET_TEMPLATES,
  getActiveSalaryDrop,
  getActiveDrops,
  getAllocationsForDrop,
  calculateWalletStats,
  calculateDropSummary,
  generateMissionFeed,
  generateWalletPaceData,
  transformAllocation,
  transformTransaction,
  transformMoneyDrop,
  transformDebt,
  transformSubscription,
  transformBudgetTemplate,
} from '../utils/financeTypes';
import { pb } from '../utils/pocketbase';

interface FinanceContextType {
  // Core Data
  moneyDrops: MoneyDrop[];
  debts: Debt[];
  subscriptions: Subscription[];
  allocations: Allocation[];
  transactions: Transaction[];
  budgetTemplates: BudgetTemplate[];

  // Active State (computed)
  activeSalaryDrop: MoneyDrop | null;
  activeDrops: MoneyDrop[];
  
  // Allocation Categories (computed)
  livingWallet: Allocation | null;
  playWallet: Allocation | null;
  missionFeed: MissionItem[];
  
  // Stats (computed)
  walletStats: Map<string, WalletStats>;
  dropSummary: ActiveDropSummary | null;
  livingWalletPaceData: DailySpendData[];

  // State
  isLoading: boolean;
  error: string | null;
  isMock: boolean;

  // Actions
  refetch: () => void;
  createTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>;
  createMoneyDrop: (data: Omit<MoneyDrop, 'id'>) => Promise<MoneyDrop>;
  createAllocation: (data: Omit<Allocation, 'id'>) => Promise<Allocation>;
  createDebt: (data: Omit<Debt, 'id'>) => Promise<Debt>;
  createSubscription: (data: Omit<Subscription, 'id'>) => Promise<Subscription>;
  updateAllocationBalance: (id: string, newBalance: number) => Promise<void>;
  updateDebtRemaining: (id: string, newRemaining: number) => Promise<void>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>;
  updateSubscription: (id: string, data: Partial<Subscription>) => Promise<void>;
  updateMoneyDrop: (id: string, data: Partial<MoneyDrop>) => Promise<void>;
  updateAllocation: (id: string, data: Partial<Allocation>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
  deleteMoneyDrop: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function useFinanceData(): FinanceContextType {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceData must be used within a FinanceProvider');
  }
  return context;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [moneyDrops, setMoneyDrops] = useState<MoneyDrop[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data (mock or real)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setMoneyDrops(MOCK_MONEY_DROPS);
        setDebts(MOCK_DEBTS);
        setSubscriptions(MOCK_SUBSCRIPTIONS);
        setAllocations(MOCK_ALLOCATIONS);
        setTransactions(MOCK_TRANSACTIONS);
        setBudgetTemplates(MOCK_BUDGET_TEMPLATES);
      } else {
        const [dropsRes, debtsRes, subsRes, allocRes, txnsRes, templatesRes] = await Promise.all([
          pb.collection('money_drops').getFullList({ requestKey: null }),
          pb.collection('debts').getFullList({ requestKey: null }),
          pb.collection('subscriptions').getFullList({ requestKey: null }),
          pb.collection('allocations').getFullList({ requestKey: null }),
          pb.collection('transactions').getFullList({ requestKey: null }),
          pb.collection('budget_templates').getFullList({ requestKey: null }),
        ]);

        setMoneyDrops(dropsRes.map(r => transformMoneyDrop(r as Record<string, unknown>)));
        setDebts(debtsRes.map(r => transformDebt(r as Record<string, unknown>)));
        setSubscriptions(subsRes.map(r => transformSubscription(r as Record<string, unknown>)));
        setAllocations(allocRes.map(r => transformAllocation(r as unknown as AllocationRaw)));
        setTransactions(txnsRes.map(r => transformTransaction(r as Record<string, unknown>)));
        setBudgetTemplates(templatesRes.map(r => transformBudgetTemplate(r as Record<string, unknown>)));
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('autocancelled')) {
        setIsLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch finance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed values
  const activeSalaryDrop = useMemo(() => getActiveSalaryDrop(moneyDrops), [moneyDrops]);
  const activeDrops = useMemo(() => getActiveDrops(moneyDrops, allocations), [moneyDrops, allocations]);

  const salaryDropAllocations = useMemo(() => {
    if (!activeSalaryDrop) return [];
    return getAllocationsForDrop(allocations, activeSalaryDrop.id);
  }, [allocations, activeSalaryDrop]);

  const livingWallet = useMemo(() => {
    return salaryDropAllocations.find(a => a.category === 'living') || null;
  }, [salaryDropAllocations]);

  const playWallet = useMemo(() => {
    return salaryDropAllocations.find(a => a.category === 'play') || null;
  }, [salaryDropAllocations]);

  const missionFeed = useMemo(() => {
    const allActiveAllocations = activeDrops.flatMap(drop => 
      getAllocationsForDrop(allocations, drop.id)
    );
    return generateMissionFeed(allActiveAllocations, debts, subscriptions);
  }, [activeDrops, allocations, debts, subscriptions]);

  const walletStats = useMemo(() => {
    const stats = new Map<string, WalletStats>();
    if (livingWallet && activeSalaryDrop) {
      stats.set(livingWallet.id, calculateWalletStats(livingWallet, activeSalaryDrop));
    }
    if (playWallet && activeSalaryDrop) {
      stats.set(playWallet.id, calculateWalletStats(playWallet, activeSalaryDrop));
    }
    return stats;
  }, [livingWallet, playWallet, activeSalaryDrop]);

  const dropSummary = useMemo(() => {
    if (!activeSalaryDrop) return null;
    return calculateDropSummary(activeSalaryDrop, allocations);
  }, [activeSalaryDrop, allocations]);

  const livingWalletPaceData = useMemo(() => {
    if (!livingWallet || !activeSalaryDrop) return [];
    return generateWalletPaceData(livingWallet, transactions, activeSalaryDrop);
  }, [livingWallet, transactions, activeSalaryDrop]);

  // ============================================
  // Mutation Actions
  // ============================================

  const createTransaction = useCallback(async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    if (USE_MOCK_DATA) {
      const newTransaction: Transaction = { ...data, id: `txn-${Date.now()}` };
      setTransactions(prev => [...prev, newTransaction]);
      setAllocations(prev => prev.map(a => 
        a.id === data.allocation_id 
          ? { ...a, current_balance: a.current_balance - data.amount }
          : a
      ));
      return newTransaction;
    }
    
    const pbData = {
      amount: data.amount,
      description: data.description,
      transaction_date: data.timestamp,
      allocation_id: data.allocation_id,
    };
    const record = await pb.collection('transactions').create(pbData, { requestKey: null });
    
    const allocation = allocations.find(a => a.id === data.allocation_id);
    if (allocation) {
      await pb.collection('allocations').update(data.allocation_id, {
        current_balance: allocation.current_balance - data.amount,
      }, { requestKey: null });
    }
    
    await fetchData();
    return transformTransaction(record as Record<string, unknown>);
  }, [allocations, fetchData]);

  const createMoneyDrop = useCallback(async (data: Omit<MoneyDrop, 'id'>): Promise<MoneyDrop> => {
    if (USE_MOCK_DATA) {
      const newDrop: MoneyDrop = { ...data, id: `drop-${Date.now()}` };
      setMoneyDrops(prev => [...prev, newDrop]);
      return newDrop;
    }
    
    const record = await pb.collection('money_drops').create(data, { requestKey: null });
    await fetchData();
    return transformMoneyDrop(record as Record<string, unknown>);
  }, [fetchData]);

  const createAllocation = useCallback(async (data: Omit<Allocation, 'id'>): Promise<Allocation> => {
    if (USE_MOCK_DATA) {
      const newAllocation: Allocation = { ...data, id: `alloc-${Date.now()}` };
      setAllocations(prev => [...prev, newAllocation]);
      return newAllocation;
    }
    
    const categoryToType = (cat: string): string => {
      switch (cat) {
        case 'living': case 'play': return 'wallet';
        case 'bills': return 'bill';
        case 'debt': return 'debt';
        case 'savings': return 'savings';
        default: return 'wallet';
      }
    };

    const pbData = {
      name: data.name,
      total_budget: data.total_budget,
      current_balance: data.current_balance,
      is_strict: data.is_strict || false,
      type: categoryToType(data.category),
      money_drop_id: data.money_drop_id || null,
      linked_debt_id: data.linked_debt_id || null,
      linked_subscription_id: data.linked_subscription_id || null,
    };
    
    const record = await pb.collection('allocations').create(pbData, { requestKey: null });
    await fetchData();
    return transformAllocation(record as unknown as AllocationRaw);
  }, [fetchData]);

  const createDebt = useCallback(async (data: Omit<Debt, 'id'>): Promise<Debt> => {
    if (USE_MOCK_DATA) {
      const newDebt: Debt = { ...data, id: `debt-${Date.now()}` };
      setDebts(prev => [...prev, newDebt]);
      return newDebt;
    }
    
    const record = await pb.collection('debts').create(data, { requestKey: null });
    await fetchData();
    return transformDebt(record as Record<string, unknown>);
  }, [fetchData]);

  const createSubscription = useCallback(async (data: Omit<Subscription, 'id'>): Promise<Subscription> => {
    if (USE_MOCK_DATA) {
      const newSub: Subscription = { ...data, id: `sub-${Date.now()}` };
      setSubscriptions(prev => [...prev, newSub]);
      return newSub;
    }
    
    const record = await pb.collection('subscriptions').create(data, { requestKey: null });
    await fetchData();
    return transformSubscription(record as Record<string, unknown>);
  }, [fetchData]);

  const updateAllocationBalance = useCallback(async (id: string, newBalance: number): Promise<void> => {
    if (USE_MOCK_DATA) {
      setAllocations(prev => prev.map(a => a.id === id ? { ...a, current_balance: newBalance } : a));
      return;
    }
    await pb.collection('allocations').update(id, { current_balance: newBalance }, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const updateDebtRemaining = useCallback(async (id: string, newRemaining: number): Promise<void> => {
    if (USE_MOCK_DATA) {
      setDebts(prev => prev.map(d => d.id === id ? { ...d, remaining_amount: newRemaining } : d));
      return;
    }
    await pb.collection('debts').update(id, { remaining_amount: newRemaining }, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const updateDebt = useCallback(async (id: string, data: Partial<Debt>): Promise<void> => {
    if (USE_MOCK_DATA) {
      setDebts(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
      return;
    }
    await pb.collection('debts').update(id, data, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const updateSubscription = useCallback(async (id: string, data: Partial<Subscription>): Promise<void> => {
    if (USE_MOCK_DATA) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      return;
    }
    await pb.collection('subscriptions').update(id, data, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const updateMoneyDrop = useCallback(async (id: string, data: Partial<MoneyDrop>): Promise<void> => {
    if (USE_MOCK_DATA) {
      setMoneyDrops(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
      return;
    }
    await pb.collection('money_drops').update(id, data, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const updateAllocation = useCallback(async (id: string, data: Partial<Allocation>): Promise<void> => {
    if (USE_MOCK_DATA) {
      setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      return;
    }
    
    // Transform category to type for PocketBase
    const categoryToType = (cat: string): string => {
      switch (cat) {
        case 'living': case 'play': return 'wallet';
        case 'bills': return 'bill';
        case 'debt': return 'debt';
        case 'savings': return 'savings';
        default: return 'wallet';
      }
    };
    
    const pbData: Record<string, unknown> = { ...data };
    if (data.category) {
      pbData.type = categoryToType(data.category);
      delete pbData.category;
    }
    // Remove non-PB fields
    delete pbData.icon;
    delete pbData.color;
    delete pbData.daily_limit;
    
    await pb.collection('allocations').update(id, pbData, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const deleteDebt = useCallback(async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      setDebts(prev => prev.filter(d => d.id !== id));
      return;
    }
    await pb.collection('debts').delete(id, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const deleteSubscription = useCallback(async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      return;
    }
    await pb.collection('subscriptions').delete(id, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      return;
    }
    await pb.collection('transactions').delete(id, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const deleteAllocation = useCallback(async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      setAllocations(prev => prev.filter(a => a.id !== id));
      return;
    }
    await pb.collection('allocations').delete(id, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const deleteMoneyDrop = useCallback(async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      setMoneyDrops(prev => prev.filter(d => d.id !== id));
      return;
    }
    await pb.collection('money_drops').delete(id, { requestKey: null });
    await fetchData();
  }, [fetchData]);

  const value: FinanceContextType = {
    moneyDrops,
    debts,
    subscriptions,
    allocations,
    transactions,
    budgetTemplates,
    activeSalaryDrop,
    activeDrops,
    livingWallet,
    playWallet,
    missionFeed,
    walletStats,
    dropSummary,
    livingWalletPaceData,
    isLoading,
    error,
    isMock: USE_MOCK_DATA,
    refetch: fetchData,
    createTransaction,
    createMoneyDrop,
    createAllocation,
    createDebt,
    createSubscription,
    updateAllocationBalance,
    updateDebtRemaining,
    updateDebt,
    updateSubscription,
    updateMoneyDrop,
    updateAllocation,
    deleteDebt,
    deleteSubscription,
    deleteTransaction,
    deleteAllocation,
    deleteMoneyDrop,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}
