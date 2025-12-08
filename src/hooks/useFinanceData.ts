import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  FinancialCycle,
  Income,
  Allocation,
  AllocationRaw,
  Transaction,
  WalletStats,
  CycleOverview,
  DailySpendData,
} from '../utils/financeTypes';
import {
  USE_MOCK_DATA,
  MOCK_CYCLES,
  MOCK_INCOMES,
  MOCK_ALLOCATIONS,
  MOCK_TRANSACTIONS,
  getActiveCycle,
  getAllocationsForCycle,
  getIncomesForCycle,
  calculateWalletStats,
  calculateCycleOverview,
  generateWalletPaceData,
  transformAllocation,
  transformTransaction,
  transformCycle,
  transformIncome,
} from '../utils/financeTypes';
import { pb } from '../utils/pocketbase';

interface UseFinanceDataReturn {
  // Data
  activeCycle: FinancialCycle | null;
  cycles: FinancialCycle[]; // All cycles
  incomes: Income[];
  allocations: Allocation[];
  transactions: Transaction[];

  // Computed
  activeWallets: Allocation[]; // Living, Play - shown prominently
  stashedWallets: Allocation[]; // Rent, Savings - hidden by default
  completedPayments: Allocation[]; // Debt payments already made
  walletStats: Map<string, WalletStats>;
  cycleOverview: CycleOverview | null;
  livingWalletPaceData: DailySpendData[];

  // State
  isLoading: boolean;
  error: string | null;
  isMock: boolean;

  // Actions
  refetch: () => void;
  createTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>;
  createCycle: (data: Omit<FinancialCycle, 'id'>) => Promise<FinancialCycle>;
  createAllocation: (data: Omit<Allocation, 'id'>) => Promise<Allocation>;
  createIncome: (data: Omit<Income, 'id'>) => Promise<Income>;
}

/**
 * Hook for managing finance data with the "Golden Rule" system
 * Toggle USE_MOCK_DATA in financeTypes.ts to switch between mock and real data
 */
export function useFinanceData(): UseFinanceDataReturn {
  const [cycles, setCycles] = useState<FinancialCycle[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data (mock or real)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        // Simulate network delay for realistic feel
        await new Promise(resolve => setTimeout(resolve, 500));

        setCycles(MOCK_CYCLES);
        setIncomes(MOCK_INCOMES);
        setAllocations(MOCK_ALLOCATIONS);
        setTransactions(MOCK_TRANSACTIONS);
      } else {
        // Fetch from PocketBase - disable auto-cancel with requestKey: null
        const cyclesRes = await pb.collection('financial_cycles').getFullList({
          requestKey: null, // Disable auto-cancel
        });
        const incomesRes = await pb.collection('incomes').getFullList({
          requestKey: null,
        });
        const allocationsRes = await pb.collection('allocations').getFullList({
          requestKey: null,
        });
        const transactionsRes = await pb.collection('transactions').getFullList({
          requestKey: null,
        });

        // Transform PocketBase responses to our UI types
        setCycles(cyclesRes.map(r => transformCycle(r as Record<string, unknown>)));
        setIncomes(incomesRes.map(r => transformIncome(r as Record<string, unknown>)));
        setAllocations(allocationsRes.map(r => transformAllocation(r as unknown as AllocationRaw)));
        setTransactions(transactionsRes.map(r => transformTransaction(r as Record<string, unknown>)));
      }
    } catch (err) {
      // Ignore auto-cancellation errors
      if (err instanceof Error && err.message.includes('autocancelled')) {
        console.log('[Finance] Request was autocancelled, ignoring...');
        setIsLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch finance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Get active cycle
  const activeCycle = useMemo(() => getActiveCycle(cycles), [cycles]);

  // Get cycle-specific data
  const cycleIncomes = useMemo(() => {
    if (!activeCycle) return [];
    return getIncomesForCycle(incomes, activeCycle.id);
  }, [incomes, activeCycle]);

  const cycleAllocations = useMemo(() => {
    if (!activeCycle) return [];
    return getAllocationsForCycle(allocations, activeCycle.id);
  }, [allocations, activeCycle]);

  // Categorize allocations for UI
  const activeWallets = useMemo(() => {
    return cycleAllocations.filter(a =>
      (a.category === 'living' || a.category === 'play') &&
      a.current_balance > 0
    );
  }, [cycleAllocations]);

  const stashedWallets = useMemo(() => {
    return cycleAllocations.filter(a =>
      (a.category === 'bills' || a.category === 'savings') &&
      a.current_balance > 0
    );
  }, [cycleAllocations]);

  const completedPayments = useMemo(() => {
    return cycleAllocations.filter(a =>
      a.category === 'debt' && a.current_balance === 0
    );
  }, [cycleAllocations]);

  // Calculate wallet stats
  const walletStats = useMemo(() => {
    const stats = new Map<string, WalletStats>();
    if (!activeCycle) return stats;

    cycleAllocations.forEach(allocation => {
      stats.set(allocation.id, calculateWalletStats(allocation, activeCycle.end_date));
    });

    return stats;
  }, [cycleAllocations, activeCycle]);

  // Calculate cycle overview
  const cycleOverview = useMemo(() => {
    if (!activeCycle) return null;
    return calculateCycleOverview(cycleIncomes, cycleAllocations);
  }, [cycleIncomes, cycleAllocations, activeCycle]);

  // Generate pace data for the living wallet
  const livingWalletPaceData = useMemo(() => {
    if (!activeCycle) return [];
    const livingWallet = cycleAllocations.find(a => a.category === 'living');
    if (!livingWallet) return [];
    return generateWalletPaceData(livingWallet, transactions, activeCycle);
  }, [cycleAllocations, transactions, activeCycle]);

  // Create a new transaction
  const createTransaction = useCallback(async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    if (USE_MOCK_DATA) {
      // Mock: just create a fake ID and add to state
      const newTransaction: Transaction = {
        ...data,
        id: `txn-${Date.now()}`,
      };
      setTransactions(prev => [...prev, newTransaction]);
      
      // Also update the allocation's current_balance
      setAllocations(prev => prev.map(a => 
        a.id === data.allocation_id 
          ? { ...a, current_balance: a.current_balance - data.amount }
          : a
      ));
      
      return newTransaction;
    }
    
    // Real: create in PocketBase (map timestamp to transaction_date)
    const pbData = {
      amount: data.amount,
      description: data.description,
      transaction_date: data.timestamp, // PB field name
      allocation_id: data.allocation_id,
    };
    const record = await pb.collection('transactions').create(pbData, {
      requestKey: null, // Disable auto-cancel for mutations
    });
    
    // Update allocation balance in PocketBase
    const allocation = allocations.find(a => a.id === data.allocation_id);
    if (allocation) {
      await pb.collection('allocations').update(data.allocation_id, {
        current_balance: allocation.current_balance - data.amount,
      }, { requestKey: null });
    }
    
    await fetchData(); // Refresh all data
    return transformTransaction(record as Record<string, unknown>);
  }, [allocations, fetchData]);

  // Create a new cycle
  const createCycle = useCallback(async (data: Omit<FinancialCycle, 'id'>): Promise<FinancialCycle> => {
    if (USE_MOCK_DATA) {
      const newCycle: FinancialCycle = {
        ...data,
        id: `cycle-${Date.now()}`,
      };
      setCycles(prev => [...prev, newCycle]);
      return newCycle;
    }
    
    const record = await pb.collection('financial_cycles').create(data, {
      requestKey: null,
    });
    await fetchData();
    return transformCycle(record as Record<string, unknown>);
  }, [fetchData]);

  // Create a new allocation (map UI fields to PB fields)
  const createAllocation = useCallback(async (data: Omit<Allocation, 'id'>): Promise<Allocation> => {
    if (USE_MOCK_DATA) {
      const newAllocation: Allocation = {
        ...data,
        id: `alloc-${Date.now()}`,
      };
      setAllocations(prev => [...prev, newAllocation]);
      return newAllocation;
    }
    
    // Map category back to PB type
    const categoryToType = (cat: string): string => {
      switch (cat) {
        case 'living':
        case 'play': return 'wallet';
        case 'bills': return 'bill';
        case 'debt': return 'debt';
        case 'savings': return 'savings';
        default: return 'wallet';
      }
    };
    
    const pbData = {
      name: data.name,
      type: categoryToType(data.category),
      total_budget: data.total_budget,
      current_balance: data.current_balance,
      is_strict: data.is_strict,
      cycle_id: data.cycle_id,
    };
    
    const record = await pb.collection('allocations').create(pbData, {
      requestKey: null,
    });
    await fetchData();
    return transformAllocation(record as unknown as AllocationRaw);
  }, [fetchData]);

  // Create a new income
  const createIncome = useCallback(async (data: Omit<Income, 'id'>): Promise<Income> => {
    if (USE_MOCK_DATA) {
      const newIncome: Income = {
        ...data,
        id: `income-${Date.now()}`,
      };
      setIncomes(prev => [...prev, newIncome]);
      return newIncome;
    }
    
    const record = await pb.collection('incomes').create(data, {
      requestKey: null,
    });
    await fetchData();
    return transformIncome(record as Record<string, unknown>);
  }, [fetchData]);

  return {
    activeCycle,
    cycles,
    incomes: cycleIncomes,
    allocations: cycleAllocations,
    transactions,
    activeWallets,
    stashedWallets,
    completedPayments,
    walletStats,
    cycleOverview,
    livingWalletPaceData,
    isLoading,
    error,
    isMock: USE_MOCK_DATA,
    refetch: fetchData,
    createTransaction,
    createCycle,
    createAllocation,
    createIncome,
  };
}
