import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  FinancialCycle,
  Income,
  Allocation,
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
} from '../utils/financeTypes';

interface UseFinanceDataReturn {
  // Data
  activeCycle: FinancialCycle | null;
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
        // TODO: Replace with actual PocketBase API calls
        // const pb = new PocketBase('https://your-pocketbase-url.com');
        // const cyclesData = await pb.collection('financial_cycles').getFullList();
        // const incomesData = await pb.collection('incomes').getFullList();
        // const allocationsData = await pb.collection('allocations').getFullList();
        // const transactionsData = await pb.collection('transactions').getFullList();
        
        // For now, fall back to mock data
        setCycles(MOCK_CYCLES);
        setIncomes(MOCK_INCOMES);
        setAllocations(MOCK_ALLOCATIONS);
        setTransactions(MOCK_TRANSACTIONS);
      }
    } catch (err) {
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

  return {
    activeCycle,
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
  };
}
