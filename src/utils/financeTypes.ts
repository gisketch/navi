/**
 * Finance Types & Mock Data
 * Based on the "Money Drop" zero-based budgeting system
 *
 * Architecture:
 * - Money Drops: Source of money (Salary or Extra)
 *   - Salary Drop: Regular income with period (period_start/end), creates daily budget
 *   - Extra Drop: One-time income without period, targeted to debts/savings
 * - Allocations: Virtual wallets/buckets linked to money drops
 * - Debts: Tracked debts with priority and remaining amounts
 * - Subscriptions: Recurring bills (utilities, subscriptions, rent)
 * - Transactions: Money leaving wallets
 */

// ============================================
// Types
// ============================================

export type MoneyDropType = 'salary' | 'extra';
export type AllocationType = 'wallet' | 'bill' | 'debt' | 'savings';
export type AllocationCategory = 'living' | 'play' | 'bills' | 'debt' | 'savings';
export type TransactionType = 'expense' | 'transfer' | 'payment';
export type DebtPriority = 'critical' | 'high' | 'medium' | 'low';
export type SubscriptionCategory = 'subscription' | 'utility' | 'rent';

// ============================================
// Core Interfaces
// ============================================

/**
 * Money Drop - Unified concept replacing cycles + incomes
 * Salary type has period_start/period_end
 * Extra type targets specific debts/savings
 */
export interface MoneyDrop {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO date - when received/expected
  is_received: boolean; // false = expected, true = received
  type: MoneyDropType;
  period_start?: string; // ISO date - only for salary type
  period_end?: string; // ISO date - only for salary type
}

/**
 * Debt tracking
 */
export interface Debt {
  id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  priority: DebtPriority;
  due_date?: string; // ISO date - optional
  notes?: string;
}

/**
 * Subscription / Recurring bill
 */
export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_day: number; // 1-31
  category: SubscriptionCategory;
  is_active: boolean;
  end_on_date?: string | null; // ISO date string, null means recurring indefinitely
}

/**
 * Budget template for auto-allocations on salary drops
 */
export interface BudgetTemplate {
  id: string;
  name: string;
  allocation_rules: AllocationRule[];
  salary: number; // Base salary this template is designed for
}

export interface AllocationRule {
  name: string;
  type: AllocationType;
  percentage?: number; // Either percentage or fixed_amount
  fixed_amount?: number;
  is_strict: boolean;
  linked_subscription_id?: string; // For bills
  linked_debt_id?: string; // For debt payments
}

// Raw allocation from PocketBase
export interface AllocationRaw {
  id: string;
  name: string;
  type: AllocationType; // PB field name
  total_budget: number;
  current_balance: number;
  is_strict: boolean;
  money_drop_id: string;
  linked_debt_id?: string;
  linked_subscription_id?: string;
}

// Enriched allocation for UI (with derived fields)
export interface Allocation {
  id: string;
  name: string;
  icon: string; // derived from type/name
  category: AllocationCategory; // derived from type
  total_budget: number;
  current_balance: number;
  is_strict: boolean;
  color: string; // derived from category
  money_drop_id: string;
  linked_debt_id?: string;
  linked_subscription_id?: string;
  daily_limit?: number; // calculated, not stored
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  timestamp: string; // ISO datetime (maps to transaction_date in PB)
  allocation_id: string;
  type?: TransactionType; // optional since PB doesn't have this
}

// ============================================
// Computed/Derived Types
// ============================================

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

export interface ActiveDropSummary {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
  daysRemaining: number;
  dailyBudget: number;
}

// Mission Feed item types
export type MissionType = 'unassigned' | 'due-bill' | 'debt-payment' | 'completed';

export interface MissionItem {
  id: string;
  type: MissionType;
  allocation: Allocation;
  linkedDebt?: Debt;
  linkedSubscription?: Subscription;
  dueDate?: string;
  priority: number; // For sorting: 0 = unassigned, 1 = due soon, 2 = debt, 3 = completed
}

// ============================================
// Color Classes for UI
// ============================================

export const allocationColorClasses: Record<string, {
  text: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    glow: 'rgba(52, 211, 153, 0.5)',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/20',
    border: 'border-violet-500/30',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/30',
    glow: 'rgba(34, 211, 238, 0.5)',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    glow: 'rgba(251, 191, 36, 0.5)',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    glow: 'rgba(248, 113, 113, 0.5)',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    glow: 'rgba(96, 165, 250, 0.5)',
  },
};

export const priorityColors: Record<DebtPriority, string> = {
  critical: 'red',
  high: 'amber',
  medium: 'cyan',
  low: 'emerald',
};

// ============================================
// Transform Functions (PocketBase → UI)
// ============================================

// Map PB allocation type to UI category
function typeToCategory(type: AllocationType): AllocationCategory {
  switch (type) {
    case 'wallet': return 'living';
    case 'bill': return 'bills';
    case 'debt': return 'debt';
    case 'savings': return 'savings';
    default: return 'living';
  }
}

// Map category to color
function categoryToColor(category: AllocationCategory): string {
  switch (category) {
    case 'living': return 'emerald';
    case 'play': return 'violet';
    case 'bills': return 'amber';
    case 'savings': return 'cyan';
    case 'debt': return 'red';
    default: return 'emerald';
  }
}

// Map category to default icon
function categoryToIcon(category: AllocationCategory, name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('play') || lowerName.includes('fun') || lowerName.includes('entertainment')) {
    return 'Gamepad2';
  }
  if (lowerName.includes('food') || lowerName.includes('grocery')) {
    return 'Utensils';
  }
  if (lowerName.includes('transport') || lowerName.includes('gas') || lowerName.includes('commute')) {
    return 'Car';
  }
  if (lowerName.includes('living') || lowerName.includes('daily')) {
    return 'ShoppingCart';
  }
  
  switch (category) {
    case 'living': return 'Wallet';
    case 'play': return 'Gamepad2';
    case 'bills': return 'Receipt';
    case 'savings': return 'PiggyBank';
    case 'debt': return 'CreditCard';
    default: return 'Wallet';
  }
}

// Transform raw PB allocation to enriched UI allocation
export function transformAllocation(raw: AllocationRaw): Allocation {
  const lowerName = raw.name.toLowerCase();
  const isPlay = lowerName.includes('play') || lowerName.includes('fun') || 
                 lowerName.includes('entertainment') || lowerName.includes('leisure');
  
  const category: AllocationCategory = isPlay ? 'play' : typeToCategory(raw.type);
  
  return {
    id: raw.id,
    name: raw.name,
    icon: categoryToIcon(category, raw.name),
    category,
    total_budget: raw.total_budget,
    current_balance: raw.current_balance,
    is_strict: raw.is_strict,
    color: categoryToColor(category),
    money_drop_id: raw.money_drop_id,
    linked_debt_id: raw.linked_debt_id,
    linked_subscription_id: raw.linked_subscription_id,
  };
}

// Transform PB money drop
export function transformMoneyDrop(raw: Record<string, unknown>): MoneyDrop {
  return {
    id: raw.id as string,
    name: (raw.name as string) || 'Unnamed Drop',
    amount: raw.amount as number,
    date: ((raw.date as string) || '').split('T')[0],
    is_received: raw.is_received as boolean ?? false,
    type: (raw.type as MoneyDropType) || 'salary',
    period_start: raw.period_start ? ((raw.period_start as string) || '').split('T')[0] : undefined,
    period_end: raw.period_end ? ((raw.period_end as string) || '').split('T')[0] : undefined,
  };
}

// Transform PB debt
export function transformDebt(raw: Record<string, unknown>): Debt {
  return {
    id: raw.id as string,
    name: (raw.name as string) || 'Unnamed Debt',
    total_amount: raw.total_amount as number,
    remaining_amount: raw.remaining_amount as number,
    priority: (raw.priority as DebtPriority) || 'medium',
    due_date: raw.due_date ? ((raw.due_date as string) || '').split('T')[0] : undefined,
    notes: raw.notes as string | undefined,
  };
}

// Transform PB subscription
export function transformSubscription(raw: Record<string, unknown>): Subscription {
  return {
    id: raw.id as string,
    name: (raw.name as string) || 'Unnamed Subscription',
    amount: raw.amount as number,
    billing_day: raw.billing_day as number,
    category: (raw.category as SubscriptionCategory) || 'subscription',
    is_active: raw.is_active as boolean ?? true,
  };
}

// Transform PB transaction
export function transformTransaction(raw: Record<string, unknown>): Transaction {
  return {
    id: raw.id as string,
    amount: raw.amount as number,
    description: (raw.description as string) || '',
    timestamp: (raw.transaction_date as string) || new Date().toISOString(),
    allocation_id: raw.allocation_id as string,
    type: 'expense',
  };
}

// Transform PB budget template
export function transformBudgetTemplate(raw: Record<string, unknown>): BudgetTemplate {
  return {
    id: raw.id as string,
    name: (raw.name as string) || 'Unnamed Template',
    allocation_rules: (raw.allocation_rules as AllocationRule[]) || [],
    salary: raw.salary as number,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get active salary drop (within period and received)
 */
export function getActiveSalaryDrop(drops: MoneyDrop[]): MoneyDrop | null {
  const today = new Date().toISOString().split('T')[0];
  
  return drops.find(drop => 
    drop.type === 'salary' &&
    drop.is_received &&
    drop.period_start &&
    drop.period_end &&
    drop.period_start <= today &&
    today <= drop.period_end
  ) || null;
}

/**
 * Get all active money drops (salary + extras with remaining balance)
 */
export function getActiveDrops(
  drops: MoneyDrop[],
  allocations: Allocation[]
): MoneyDrop[] {
  const today = new Date().toISOString().split('T')[0];
  
  return drops.filter(drop => {
    if (!drop.is_received) return false;
    
    if (drop.type === 'salary') {
      return drop.period_start && drop.period_end &&
             drop.period_start <= today && today <= drop.period_end;
    }
    
    // Extra drop: active if any allocations have remaining balance
    const dropAllocations = allocations.filter(a => a.money_drop_id === drop.id);
    return dropAllocations.some(a => a.current_balance > 0);
  });
}

/**
 * Get allocations for a specific money drop
 */
export function getAllocationsForDrop(
  allocations: Allocation[],
  dropId: string
): Allocation[] {
  return allocations.filter(a => a.money_drop_id === dropId);
}

/**
 * Calculate days remaining in a salary drop period
 */
export function getDaysRemaining(drop: MoneyDrop): number {
  if (drop.type !== 'salary' || !drop.period_end) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(drop.period_end);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays + 1); // Include today
}

/**
 * Calculate wallet stats for an allocation
 */
export function calculateWalletStats(
  allocation: Allocation,
  drop: MoneyDrop | null
): WalletStats {
  const spent = allocation.total_budget - allocation.current_balance;
  const daysRemaining = drop ? getDaysRemaining(drop) : 1;
  const dailySafeSpend = daysRemaining > 0 ? allocation.current_balance / daysRemaining : 0;
  const idealDailySpend = daysRemaining > 0 ? allocation.total_budget / daysRemaining : 0;
  
  return {
    totalBudget: allocation.total_budget,
    currentBalance: allocation.current_balance,
    spent,
    dailySafeSpend: Math.round(dailySafeSpend * 100) / 100,
    daysRemaining,
    isOnTrack: dailySafeSpend >= idealDailySpend * 0.8, // Within 20% of ideal
  };
}

/**
 * Calculate active drop summary
 */
export function calculateDropSummary(
  drop: MoneyDrop,
  allocations: Allocation[]
): ActiveDropSummary {
  const dropAllocations = allocations.filter(a => a.money_drop_id === drop.id);
  const totalAllocated = dropAllocations.reduce((sum, a) => sum + a.total_budget, 0);
  const totalSpent = dropAllocations.reduce((sum, a) => sum + (a.total_budget - a.current_balance), 0);
  const daysRemaining = getDaysRemaining(drop);
  const remainingBalance = dropAllocations.reduce((sum, a) => sum + a.current_balance, 0);
  
  return {
    totalIncome: drop.amount,
    totalAllocated,
    totalSpent,
    unallocated: drop.amount - totalAllocated,
    daysRemaining,
    dailyBudget: daysRemaining > 0 ? remainingBalance / daysRemaining : 0,
  };
}

/**
 * Generate mission feed from allocations
 */
export function generateMissionFeed(
  allocations: Allocation[],
  debts: Debt[],
  subscriptions: Subscription[]
): MissionItem[] {
  const missions: MissionItem[] = [];
  const today = new Date();
  const currentDay = today.getDate();
  
  for (const allocation of allocations) {
    let mission: MissionItem;
    
    // Skip living/play wallets - they appear in hero section
    if (allocation.category === 'living' || allocation.category === 'play') {
      continue;
    }
    
    const linkedDebt = allocation.linked_debt_id 
      ? debts.find(d => d.id === allocation.linked_debt_id) 
      : undefined;
    const linkedSubscription = allocation.linked_subscription_id
      ? subscriptions.find(s => s.id === allocation.linked_subscription_id)
      : undefined;
    
    // Determine mission type
    if (allocation.current_balance === 0) {
      // Completed
      mission = {
        id: allocation.id,
        type: 'completed',
        allocation,
        linkedDebt,
        linkedSubscription,
        priority: 3,
      };
    } else if (linkedSubscription) {
      // Bill - check if due soon
      const dueDate = new Date(today);
      dueDate.setDate(linkedSubscription.billing_day);
      if (linkedSubscription.billing_day < currentDay) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      mission = {
        id: allocation.id,
        type: 'due-bill',
        allocation,
        linkedSubscription,
        dueDate: dueDate.toISOString().split('T')[0],
        priority: 1,
      };
    } else if (linkedDebt) {
      // Debt payment
      mission = {
        id: allocation.id,
        type: 'debt-payment',
        allocation,
        linkedDebt,
        priority: 2,
      };
    } else {
      // Unassigned (savings or other)
      mission = {
        id: allocation.id,
        type: 'unassigned',
        allocation,
        priority: 0,
      };
    }
    
    missions.push(mission);
  }
  
  // Sort by priority
  return missions.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate pace data for wallet visualization
 */
export function generateWalletPaceData(
  allocation: Allocation,
  transactions: Transaction[],
  drop: MoneyDrop | null
): DailySpendData[] {
  if (!drop || drop.type !== 'salary' || !drop.period_start || !drop.period_end) {
    return [];
  }
  
  const startDate = new Date(drop.period_start);
  const endDate = new Date(drop.period_end);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const idealDailySpend = allocation.total_budget / totalDays;
  
  // Filter transactions for this allocation
  const allocationTxns = transactions.filter(t => t.allocation_id === allocation.id);
  
  // Build daily spend map
  const dailySpendMap = new Map<string, number>();
  for (const txn of allocationTxns) {
    const date = txn.timestamp.split('T')[0];
    dailySpendMap.set(date, (dailySpendMap.get(date) || 0) + txn.amount);
  }
  
  // Generate pace data
  const paceData: DailySpendData[] = [];
  let cumulativeIdeal = 0;
  let cumulativeActual = 0;
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate && currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    cumulativeIdeal += idealDailySpend;
    cumulativeActual += dailySpendMap.get(dateStr) || 0;
    
    paceData.push({
      date: dateStr,
      ideal: Math.round(cumulativeIdeal * 100) / 100,
      actual: Math.round(cumulativeActual * 100) / 100,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return paceData;
}

// ============================================
// Mock Data - Toggle with USE_MOCK_DATA
// ============================================

export const USE_MOCK_DATA = false;

// Mock Money Drops
export const MOCK_MONEY_DROPS: MoneyDrop[] = [
  {
    id: 'drop-salary-dec',
    name: 'December Salary',
    amount: 18000,
    date: '2024-12-01',
    is_received: true,
    type: 'salary',
    period_start: '2024-12-01',
    period_end: '2024-12-15',
  },
  {
    id: 'drop-bonus',
    name: 'Holiday Bonus',
    amount: 5000,
    date: '2024-12-05',
    is_received: true,
    type: 'extra',
  },
];

// Mock Debts
export const MOCK_DEBTS: Debt[] = [
  {
    id: 'debt-elp',
    name: 'Elp',
    total_amount: 50000,
    remaining_amount: 35000,
    priority: 'high',
    notes: 'Personal loan',
  },
  {
    id: 'debt-sloan',
    name: 'SLoan',
    total_amount: 80000,
    remaining_amount: 65000,
    priority: 'medium',
    due_date: '2025-06-01',
  },
];

// Mock Subscriptions
export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-rent',
    name: 'Rent',
    amount: 4000,
    billing_day: 5,
    category: 'rent',
    is_active: true,
  },
  {
    id: 'sub-internet',
    name: 'PLDT Internet',
    amount: 1500,
    billing_day: 15,
    category: 'utility',
    is_active: true,
  },
  {
    id: 'sub-spotify',
    name: 'Spotify',
    amount: 149,
    billing_day: 10,
    category: 'subscription',
    is_active: true,
  },
];

// Mock Allocations
export const MOCK_ALLOCATIONS: Allocation[] = [
  // Living wallet from salary drop
  {
    id: 'alloc-living',
    name: 'Living Wallet',
    icon: 'ShoppingCart',
    category: 'living',
    total_budget: 5250,
    current_balance: 3150,
    is_strict: true,
    color: 'emerald',
    money_drop_id: 'drop-salary-dec',
    daily_limit: 350,
  },
  {
    id: 'alloc-play',
    name: 'Guilt-Free Play',
    icon: 'Gamepad2',
    category: 'play',
    total_budget: 2000,
    current_balance: 1800,
    is_strict: false,
    color: 'violet',
    money_drop_id: 'drop-salary-dec',
  },
  // Bills from salary drop
  {
    id: 'alloc-rent',
    name: 'Rent',
    icon: 'Home',
    category: 'bills',
    total_budget: 4000,
    current_balance: 4000,
    is_strict: true,
    color: 'amber',
    money_drop_id: 'drop-salary-dec',
    linked_subscription_id: 'sub-rent',
  },
  {
    id: 'alloc-internet',
    name: 'Internet Bill',
    icon: 'Wifi',
    category: 'bills',
    total_budget: 1500,
    current_balance: 0, // Paid
    is_strict: true,
    color: 'amber',
    money_drop_id: 'drop-salary-dec',
    linked_subscription_id: 'sub-internet',
  },
  // Debt payment from salary drop
  {
    id: 'alloc-elp',
    name: 'Pay Elp',
    icon: 'Send',
    category: 'debt',
    total_budget: 3000,
    current_balance: 0, // Sent
    is_strict: true,
    color: 'red',
    money_drop_id: 'drop-salary-dec',
    linked_debt_id: 'debt-elp',
  },
  // Extra drop allocation for debt
  {
    id: 'alloc-bonus-sloan',
    name: 'Bonus → SLoan',
    icon: 'CreditCard',
    category: 'debt',
    total_budget: 5000,
    current_balance: 5000, // Not yet paid
    is_strict: true,
    color: 'red',
    money_drop_id: 'drop-bonus',
    linked_debt_id: 'debt-sloan',
  },
];

// Mock Transactions
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
    amount: 200,
    description: 'Steam game',
    timestamp: '2024-12-03T20:00:00Z',
    allocation_id: 'alloc-play',
    type: 'expense',
  },
  {
    id: 'tx-5',
    amount: 1500,
    description: 'Paid PLDT Internet',
    timestamp: '2024-12-03T10:00:00Z',
    allocation_id: 'alloc-internet',
    type: 'payment',
  },
  {
    id: 'tx-6',
    amount: 3000,
    description: 'Sent to Elp',
    timestamp: '2024-12-02T14:00:00Z',
    allocation_id: 'alloc-elp',
    type: 'payment',
  },
];

// Mock Budget Templates
export const MOCK_BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'template-standard',
    name: 'Standard Bi-Weekly',
    salary: 18000,
    allocation_rules: [
      { name: 'Living Wallet', type: 'wallet', percentage: 30, is_strict: true },
      { name: 'Guilt-Free Play', type: 'wallet', percentage: 10, is_strict: false },
      { name: 'Rent', type: 'bill', fixed_amount: 4000, is_strict: true, linked_subscription_id: 'sub-rent' },
      { name: 'Internet', type: 'bill', fixed_amount: 1500, is_strict: true, linked_subscription_id: 'sub-internet' },
      { name: 'Pay Elp', type: 'debt', percentage: 15, is_strict: true, linked_debt_id: 'debt-elp' },
    ],
  },
];
