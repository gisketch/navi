/**
 * Finance Types & Mock Data
 * Based on the "Golden Rule" zero-based budgeting system
 *
 * Architecture:
 * - Cycles: Time containers (pay periods)
 * - Incomes: Manual money entries (salary, freelance)
 * - Allocations: Virtual wallets/buckets (Living, Play, Bills)
 * - Transactions: Money leaving wallets
 */

// ============================================
// Types
// ============================================

export type CycleStatus = 'upcoming' | 'active' | 'completed';
export type AllocationCategory = 'living' | 'play' | 'bills' | 'debt' | 'savings';
export type TransactionType = 'expense' | 'transfer' | 'payment';

export interface FinancialCycle {
  id: string;
  name: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  status: CycleStatus;
}

export interface Income {
  id: string;
  amount: number;
  source: string; // e.g., "Netzon Salary", "Freelance"
  date_received: string; // ISO date
  cycle_id: string;
  is_confirmed: boolean; // false = expected, true = received
}

export interface Allocation {
  id: string;
  name: string;
  icon: string; // lucide icon name
  category: AllocationCategory;
  total_budget: number;
  current_balance: number;
  is_strict: boolean; // true = survival money, false = flexible
  color: string; // accent color
  cycle_id: string;
  daily_limit?: number; // optional daily spending limit
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  timestamp: string; // ISO datetime
  allocation_id: string;
  type: TransactionType;
}

// Computed/derived types
export interface DailySpendData {
  date: string;
  ideal: number;
  actual: number;
}

export interface WalletStats {
  totalBudget: number;
  currentBalance: number;
  spent: number;
  dailySafeSpend: number;
  daysRemaining: number;
  isOnTrack: boolean;
}

export interface CycleOverview {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
}

// ============================================
// Mock Data - Toggle with USE_MOCK_DATA
// ============================================

export const USE_MOCK_DATA = false;

// Current active cycle (Dec 1 - Dec 15)
export const MOCK_CYCLES: FinancialCycle[] = [
  {
    id: 'cycle-dec-early',
    name: 'Early December',
    start_date: '2024-12-01',
    end_date: '2024-12-14',
    status: 'active',
  },
  {
    id: 'cycle-dec-mid',
    name: 'Mid-December Run',
    start_date: '2024-12-15',
    end_date: '2024-12-29',
    status: 'upcoming',
  },
];

export const MOCK_INCOMES: Income[] = [
  {
    id: 'income-1',
    amount: 15000,
    source: 'Netzon Salary',
    date_received: '2024-12-01',
    cycle_id: 'cycle-dec-early',
    is_confirmed: true,
  },
  {
    id: 'income-2',
    amount: 3000,
    source: 'Freelance Project',
    date_received: '2024-12-03',
    cycle_id: 'cycle-dec-early',
    is_confirmed: true,
  },
];

export const MOCK_ALLOCATIONS: Allocation[] = [
  // Active wallets (shown prominently)
  {
    id: 'alloc-living',
    name: 'Living Wallet',
    icon: 'Utensils',
    category: 'living',
    total_budget: 5250,
    current_balance: 3150,
    is_strict: true,
    color: 'emerald',
    cycle_id: 'cycle-dec-early',
    daily_limit: 350,
  },
  {
    id: 'alloc-play',
    name: 'Guilt-Free Play',
    icon: 'Gamepad2',
    category: 'play',
    total_budget: 3250,
    current_balance: 2800,
    is_strict: false,
    color: 'violet',
    cycle_id: 'cycle-dec-early',
  },
  // Stashed allocations (hidden/collapsed)
  {
    id: 'alloc-rent',
    name: 'Rent Stash',
    icon: 'Home',
    category: 'bills',
    total_budget: 4000,
    current_balance: 4000,
    is_strict: true,
    color: 'blue',
    cycle_id: 'cycle-dec-early',
  },
  {
    id: 'alloc-emergency',
    name: 'Emergency Fund',
    icon: 'Shield',
    category: 'savings',
    total_budget: 4000,
    current_balance: 4000,
    is_strict: true,
    color: 'cyan',
    cycle_id: 'cycle-dec-early',
  },
  // Debt payments (shown as completed actions)
  {
    id: 'alloc-elp',
    name: 'Pay Elp',
    icon: 'Send',
    category: 'debt',
    total_budget: 2000,
    current_balance: 0, // Already sent
    is_strict: true,
    color: 'amber',
    cycle_id: 'cycle-dec-early',
  },
  {
    id: 'alloc-sloan',
    name: 'SLoan Payment',
    icon: 'CreditCard',
    category: 'debt',
    total_budget: 1500,
    current_balance: 0, // Already paid
    is_strict: true,
    color: 'red',
    cycle_id: 'cycle-dec-early',
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    amount: 150,
    description: 'Lunch at Jollibee',
    timestamp: '2024-12-01T12:30:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-2',
    amount: 200,
    description: 'Grab to work',
    timestamp: '2024-12-02T08:00:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-3',
    amount: 350,
    description: 'Groceries',
    timestamp: '2024-12-02T18:00:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-4',
    amount: 450,
    description: 'Steam game',
    timestamp: '2024-12-03T20:00:00Z',
    allocation_id: 'alloc-play',
    type: 'expense',
  },
  {
    id: 'tx-5',
    amount: 180,
    description: 'Dinner',
    timestamp: '2024-12-04T19:00:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-6',
    amount: 320,
    description: 'Coffee & snacks',
    timestamp: '2024-12-06T14:00:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-7',
    amount: 450,
    description: 'Grocery run',
    timestamp: '2024-12-07T11:00:00Z',
    allocation_id: 'alloc-living',
    type: 'expense',
  },
  {
    id: 'tx-8',
    amount: 2000,
    description: 'Sent to Elp',
    timestamp: '2024-12-01T10:00:00Z',
    allocation_id: 'alloc-elp',
    type: 'payment',
  },
  {
    id: 'tx-9',
    amount: 1500,
    description: 'SLoan Payment',
    timestamp: '2024-12-01T10:05:00Z',
    allocation_id: 'alloc-sloan',
    type: 'payment',
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get the currently active cycle
 */
export function getActiveCycle(cycles: FinancialCycle[]): FinancialCycle | null {
  return cycles.find(c => c.status === 'active') || null;
}

/**
 * Get allocations for a specific cycle
 */
export function getAllocationsForCycle(allocations: Allocation[], cycleId: string): Allocation[] {
  return allocations.filter(a => a.cycle_id === cycleId);
}

/**
 * Get incomes for a specific cycle
 */
export function getIncomesForCycle(incomes: Income[], cycleId: string): Income[] {
  return incomes.filter(i => i.cycle_id === cycleId);
}

/**
 * Get transactions for a specific allocation
 */
export function getTransactionsForAllocation(transactions: Transaction[], allocationId: string): Transaction[] {
  return transactions.filter(t => t.allocation_id === allocationId);
}

/**
 * Calculate days remaining in a cycle
 */
export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate days elapsed in a cycle
 */
export function getDaysElapsed(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate total days in a cycle
 */
export function getTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate wallet stats for an allocation
 */
export function calculateWalletStats(
  allocation: Allocation,
  cycleEndDate: string
): WalletStats {
  const daysRemaining = getDaysRemaining(cycleEndDate);
  const spent = allocation.total_budget - allocation.current_balance;

  // If there's a daily limit, use it; otherwise calculate from remaining balance
  const dailySafeSpend = allocation.daily_limit
    ? Math.min(allocation.daily_limit, Math.floor(allocation.current_balance / Math.max(1, daysRemaining)))
    : Math.floor(allocation.current_balance / Math.max(1, daysRemaining));

  // Check if on track: current balance should be >= (days remaining / total days) * total budget
  const totalDays = 14; // Assuming 2-week cycles
  const idealRemaining = (daysRemaining / totalDays) * allocation.total_budget;
  const isOnTrack = allocation.current_balance >= idealRemaining * 0.9; // 10% buffer

  return {
    totalBudget: allocation.total_budget,
    currentBalance: allocation.current_balance,
    spent,
    dailySafeSpend,
    daysRemaining,
    isOnTrack,
  };
}

/**
 * Calculate cycle overview
 */
export function calculateCycleOverview(
  incomes: Income[],
  allocations: Allocation[]
): CycleOverview {
  const totalIncome = incomes
    .filter(i => i.is_confirmed)
    .reduce((sum, i) => sum + i.amount, 0);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.total_budget, 0);
  const totalSpent = allocations.reduce((sum, a) => sum + (a.total_budget - a.current_balance), 0);
  const unallocated = totalIncome - totalAllocated;

  return {
    totalIncome,
    totalAllocated,
    totalSpent,
    unallocated,
  };
}

/**
 * Generate pace data for a wallet
 */
export function generateWalletPaceData(
  allocation: Allocation,
  transactions: Transaction[],
  cycle: FinancialCycle
): DailySpendData[] {
  const totalDays = getTotalDays(cycle.start_date, cycle.end_date);
  const dailyIdealDrop = allocation.total_budget / totalDays;

  const data: DailySpendData[] = [];

  // Filter transactions for this allocation
  const walletTx = transactions.filter(t => t.allocation_id === allocation.id);

  // Sort transactions by date
  const sortedTx = [...walletTx].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (let day = 0; day <= totalDays; day++) {
    const date = new Date(cycle.start_date);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // Calculate ideal balance (linear drop)
    const idealBalance = allocation.total_budget - (dailyIdealDrop * day);

    // Calculate actual balance
    const txUpToDay = sortedTx.filter(tx => {
      const txDate = tx.timestamp.split('T')[0];
      return txDate <= dateStr;
    });
    const spent = txUpToDay.reduce((sum, tx) => sum + tx.amount, 0);
    const actualBalance = allocation.total_budget - spent;

    data.push({
      date: dateStr,
      ideal: Math.round(idealBalance),
      actual: Math.round(actualBalance),
    });
  }

  return data;
}

// Allocation category colors
export const categoryColors: Record<AllocationCategory, { accent: string; glow: string; bg: string }> = {
  living: {
    accent: 'rgb(52, 211, 153)',
    glow: 'rgba(52, 211, 153, 0.4)',
    bg: 'rgba(52, 211, 153, 0.1)'
  },
  play: {
    accent: 'rgb(167, 139, 250)',
    glow: 'rgba(167, 139, 250, 0.4)',
    bg: 'rgba(167, 139, 250, 0.1)'
  },
  bills: {
    accent: 'rgb(96, 165, 250)',
    glow: 'rgba(96, 165, 250, 0.4)',
    bg: 'rgba(96, 165, 250, 0.1)'
  },
  debt: {
    accent: 'rgb(251, 191, 36)',
    glow: 'rgba(251, 191, 36, 0.4)',
    bg: 'rgba(251, 191, 36, 0.1)'
  },
  savings: {
    accent: 'rgb(34, 211, 238)',
    glow: 'rgba(34, 211, 238, 0.4)',
    bg: 'rgba(34, 211, 238, 0.1)'
  },
};

// Tailwind color classes for allocations
export const allocationColorClasses: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'rgba(52, 211, 153, 0.5)',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    glow: 'rgba(167, 139, 250, 0.5)',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'rgba(96, 165, 250, 0.5)',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    glow: 'rgba(34, 211, 238, 0.5)',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'rgba(251, 191, 36, 0.5)',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'rgba(248, 113, 113, 0.5)',
  },
};
