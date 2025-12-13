# Finance Page Documentation

The Finance page provides a comprehensive **zero-based budgeting system** called "Money Drop" with AI voice assistance, offline support, and visual tracking of income, expenses, debts, and bills.

---

## Table of Contents

1. [Overview](#overview)
2. [Money Drop Concept](#money-drop-concept)
3. [Architecture](#architecture)
4. [Offline Support & Caching](#offline-support--caching)
5. [Finance Voice Mode](#finance-voice-mode)
6. [Component Structure](#component-structure)
7. [Data Types](#data-types)
8. [Finance Tools (AI)](#finance-tools-ai)
9. [Mutation Actions](#mutation-actions)
10. [PocketBase Collections](#pocketbase-collections)

---

## Overview

The Finance page enables users to:

- **Track income** via salary drops and extra income
- **Allocate budgets** using zero-based budgeting
- **Log expenses** manually or via AI voice commands
- **Monitor debts** with priority levels
- **Track bills** and subscriptions
- **See spending pace** with visual graphs
- **Work offline** with automatic sync when back online

### Key Features

| Feature | Description |
|---------|-------------|
| Zero-Based Budgeting | Every peso is allocated to a purpose |
| Money Drops | Income sources with date ranges |
| Offline-First | Full CRUD offline with sync |
| Voice Commands | Log expenses, check balances via Navi |
| Spending Pace Graph | Visual budget burn-down |
| Mission Feed | Prioritized action items (bills, debts) |

---

## Money Drop Concept

### What is a Money Drop?

A **Money Drop** is a source of money entering your budget:

| Type | Description | Period |
|------|-------------|--------|
| **Salary** | Regular income | Has `period_start` and `period_end` (e.g., Nov 15 - Nov 30) |
| **Extra** | One-time income (bonus, gift) | No period, targeted to specific debts/savings |

### Zero-Based Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Salary Drop: ₱25,000                        │
│                   (Nov 15 - Nov 30)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ALLOCATIONS                                  │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────────────┐ │
│  │ Living       │  │ Play      │  │ Bills                     │ │
│  │ ₱8,000       │  │ ₱2,000    │  │ ₱5,000                    │ │
│  └──────────────┘  └───────────┘  └──────────────────────────┘ │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────────────┐ │
│  │ Debt         │  │ Savings   │  │ Unassigned              │ │
│  │ ₱7,000       │  │ ₱2,500    │  │ ₱500 (should be ₱0)     │ │
│  └──────────────┘  └───────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTIONS                                  │
│    [Coffee ₱150] [Groceries ₱500] [Transport ₱200]              │
│                     (from Living wallet)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Active Drop

The **active salary drop** is the one where:
- `is_received = true`
- `today` is between `period_start` and `period_end`

This determines:
- Which allocations to show
- Daily safe spend calculation
- Days remaining in budget period

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Finance.tsx                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ DailyBudgetCard  DropSummaryCard  PaceGraph                │ │
│  │ (Safe to Spend)  (Income/Allocated) (Burn-down)            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ MissionCard[]                                               │ │
│  │ [Unassigned] [Due Bills] [Debt Payments] [Completed]       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               FinanceContext (Provider)                   │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ State: moneyDrops, allocations, transactions, etc. │  │   │
│  │  │ Computed: activeSalaryDrop, livingWallet, stats    │  │   │
│  │  │ Actions: createTransaction, updateBalance, etc.    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                          │                                │   │
│  │          ┌───────────────┴───────────────┐               │   │
│  │          ▼                               ▼               │   │
│  │  ┌──────────────┐               ┌──────────────────┐     │   │
│  │  │ PocketBase   │               │ IndexedDB Cache  │     │   │
│  │  │ (online)     │               │ (offline)        │     │   │
│  │  └──────────────┘               └──────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SyncContext (Provider)                       │   │
│  │  - Monitors online/offline status                        │   │
│  │  - Syncs pending operations when back online             │   │
│  │  - Shows sync status (online/syncing/offline)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Offline Support & Caching

### Strategy: Optimistic Updates

All mutations follow this pattern:

```typescript
const createTransaction = async (data) => {
  // 1. Generate local ID
  const localId = generateLocalId('txn');
  
  // 2. Update local state immediately (optimistic)
  setTransactions(prev => [...prev, { ...data, id: localId }]);
  setAllocations(prev => prev.map(a => 
    a.id === data.allocation_id 
      ? { ...a, current_balance: a.current_balance - data.amount }
      : a
  ));
  
  // 3. Check online status
  if (!navigator.onLine) {
    // Queue for sync
    await addPendingOperation('transactions', 'create', data, localId);
    return;
  }
  
  // 4. Try remote save
  try {
    await pb.collection('transactions').create(data);
    await fetchData(); // Refresh from server
  } catch (err) {
    // Network failed - queue for sync
    await addPendingOperation('transactions', 'create', data, localId);
  }
};
```

### Cache Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Fetch Flow                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  USE_MOCK_DATA = true?        │
              │  ├── YES: Use mock data       │
              │  └── NO:  Continue            │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Try PocketBase fetch         │
              │  (all 6 collections)          │
              └───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
           SUCCESS          ERROR          
              │               │               
              ▼               ▼               
┌─────────────────┐  ┌─────────────────────────────────────┐
│ Update state    │  │ Load from IndexedDB cache           │
│ Save to cache   │  │ ┌─────────────────────────────────┐ │
└─────────────────┘  │ │ const cached = getFinanceCache()│ │
                     │ └─────────────────────────────────┘ │
                     │           │                         │
                     │   ┌───────┼───────┐                 │
                     │ FOUND    NOT FOUND                  │
                     │   │           │                     │
                     │   ▼           ▼                     │
                     │ Use cache   Show error              │
                     └─────────────────────────────────────┘
```

### IndexedDB Cache Structure

```typescript
interface FinanceCache {
  moneyDrops: MoneyDrop[];
  debts: Debt[];
  subscriptions: Subscription[];
  allocations: Allocation[];
  transactions: Transaction[];
  budgetTemplates: BudgetTemplate[];
}

// Save to cache (debounced 500ms)
await saveFinanceCache(cacheData);

// Retrieve from cache
const cached = await getFinanceCache();
```

### Pending Operations

When offline, write operations are queued:

```typescript
interface PendingOperation {
  id: string;                    // Operation ID
  collection: CollectionName;    // 'transactions', 'allocations', etc.
  operation: OperationType;      // 'create' | 'update' | 'delete'
  data: Record<string, unknown>; // Operation data
  timestamp: number;             // When queued
  localId?: string;              // For creates
}
```

### Sync on Reconnect

See [Offline Sync Documentation](./OFFLINE_SYNC.md) for full details.

---

## Finance Voice Mode

### How It Works

The Finance page has a dedicated voice mode for AI-assisted operations:

1. **Tap microphone** on Finance tab
2. `FinanceVoiceOverlay` appears with gradient dim
3. Navi moves to center, uses **finance-only tools**
4. Speak commands like "Log 200 for coffee"
5. Confirmation modal appears
6. Confirm → Transaction logged

### Voice Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Finance Voice Mode                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ FinanceVoiceOverlay                                       │   │
│  │ - Gradient dim background                                 │   │
│  │ - TranscriptBubble (live transcription)                  │   │
│  │ - StatusBubble (tool processing)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           useVoiceSession (financeMode: true)             │   │
│  │  - Uses FINANCE_TOOLS only (not all tools)               │   │
│  │  - Delegates to FinanceToolsContext                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FinanceToolsContext                          │   │
│  │  - executeFinanceTool()                                   │   │
│  │  - Shows confirmation modal for write ops                 │   │
│  │  - confirmPendingAction() / cancelPendingAction()        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Finance-Only System Prompt

When in finance mode, Navi uses a specialized prompt:

```typescript
const FINANCE_ONLY_SYSTEM_PROMPT = `
You are Navi, a helpful finance assistant focused on managing 
the user's budget and expenses.

In this mode, focus ONLY on financial tasks. If the user asks 
about non-financial topics, gently redirect them.

Be FAST and ACTION-ORIENTED:
- "150 for coffee" → IMMEDIATELY show modal
- "bought lunch" → Ask ONLY the amount, then show modal
- "owe mom 1000" → IMMEDIATELY show modal for debt
`;
```

---

## Component Structure

### Main Component: `Finance.tsx`

```typescript
interface FinanceProps {
  naviPosition?: { x: number; y: number };  // For proximity glow
  onPayBill?: (allocation: Allocation) => void;
  onPayDebt?: (allocation: Allocation) => void;
}
```

### Sub-Components

| Component | Description |
|-----------|-------------|
| `DailyBudgetCard` | Hero card showing safe-to-spend amount |
| `DropSummaryCard` | Income, allocated, unassigned summary |
| `PaceGraph` | SVG burn-down chart (ideal vs actual) |
| `MissionCard` | Individual action item (bill, debt, etc.) |
| `CollapsibleSection` | Toggle-able section wrapper |

### DailyBudgetCard

Shows the core metric - daily safe spending:

```typescript
const safeToSpend = daysRemaining > 0
  ? Math.floor(livingWallet.current_balance / daysRemaining)
  : livingWallet.current_balance;

// Example: ₱8,000 balance / 10 days = ₱800/day safe spend
```

### PaceGraph

Visual comparison of ideal vs actual spending:

```
     Ideal Line (dashed)
     ╲
      ╲____
           ╲____
                ╲___ Target
                    
     Actual Line (solid)
      ‾‾‾‾
          ‾‾‾‾
              ‾‾‾• Today
                    
   |-------|-------|-------|
  Start   Today    End
```

### MissionCard Types

```typescript
type MissionType = 
  | 'unassigned'    // Cash not yet allocated (amber)
  | 'due-bill'      // Bill due soon (purple)
  | 'debt-payment'  // Debt to pay (red)
  | 'completed';    // Already paid (emerald, strikethrough)
```

---

## Data Types

### MoneyDrop

```typescript
interface MoneyDrop {
  id: string;
  name: string;              // "November 15 Salary"
  amount: number;            // 25000
  date: string;              // "2024-11-15" (received date)
  is_received: boolean;      // true if money received
  type: 'salary' | 'extra';
  period_start?: string;     // "2024-11-15" (salary only)
  period_end?: string;       // "2024-11-30" (salary only)
}
```

### Allocation

```typescript
interface Allocation {
  id: string;
  name: string;              // "Living", "Netflix"
  icon: string;              // Lucide icon name
  category: AllocationCategory;
  total_budget: number;      // Original allocation
  current_balance: number;   // After transactions
  is_strict: boolean;        // Can't overspend
  color: string;             // UI color key
  money_drop_id: string;     // Linked money drop
  linked_debt_id?: string;   // For debt allocations
  linked_subscription_id?: string;  // For bill allocations
}

type AllocationCategory = 
  | 'living'    // Daily expenses (emerald)
  | 'play'      // Entertainment (violet)
  | 'bills'     // Subscriptions (amber)
  | 'debt'      // Debt payments (red)
  | 'savings';  // Savings (cyan)
```

### Transaction

```typescript
interface Transaction {
  id: string;
  amount: number;
  description: string;
  timestamp: string;         // ISO datetime
  allocation_id: string;     // Which wallet
  type?: 'expense' | 'transfer' | 'payment';
}
```

### Debt

```typescript
interface Debt {
  id: string;
  name: string;              // "Mom loan"
  total_amount: number;      // Original debt
  remaining_amount: number;  // Still owed
  priority: DebtPriority;    // 'critical' | 'high' | 'medium' | 'low'
  due_date?: string;
  notes?: string;
}
```

### Subscription

```typescript
interface Subscription {
  id: string;
  name: string;              // "Netflix"
  amount: number;            // Monthly cost
  billing_day: number;       // 1-31
  category: 'subscription' | 'utility' | 'rent';
  is_active: boolean;
  end_on_date?: string | null;
}
```

---

## Finance Tools (AI)

### Read-Only Tools

| Tool | Description | Returns |
|------|-------------|---------|
| `financial_forecast` | Budget overview | Active drop, daily safe spend, debts/bills summary |
| `search_bills` | Find bills | Matching subscriptions with amounts |
| `search_debts` | Find debts | Matching debts with remaining amounts |
| `search_allocations` | Find wallets | Matching allocations with balances |
| `get_transaction_logs` | Recent expenses | Transaction history with dates |

### Write Tools (Confirmation Required)

| Tool | Description | Modal |
|------|-------------|-------|
| `log_expense` | Log spending | Expense confirmation |
| `add_bill` | Add subscription | Bill details |
| `add_debt` | Add debt | Debt details |
| `pay_bill` | Pay bill | Payment confirmation |
| `pay_debt` | Pay debt | Payment confirmation |

### Tool Execution Flow

```typescript
const executeFinanceTool = async (toolName, args, toolCallId) => {
  // Read-only tools: Execute immediately
  if (!CONFIRMATION_REQUIRED_TOOLS.includes(toolName)) {
    const result = executeReadOnlyTool(toolName, args);
    return { needsConfirmation: false, result };
  }
  
  // Write tools: Prepare and show modal
  const pendingAction = prepareTool(toolName, args, toolCallId);
  setPendingAction(pendingAction);
  return { needsConfirmation: true };
};

// When user confirms
const confirmPendingAction = async () => {
  const { toolName, args, resolvedData } = pendingAction;
  
  // Execute the mutation
  await executeMutation(toolName, args, resolvedData);
  
  // Return result to Gemini
  return "Transaction logged successfully...";
};
```

### Smart Defaults

```typescript
// Default allocation for expenses
const prepareLogExpense = (args, toolCallId) => {
  // Default to "Living" wallet from active salary drop
  let allocation = livingWallet;
  
  if (args.allocation_name) {
    // User specified wallet - fuzzy match
    allocation = allocations.find(a => 
      a.name.toLowerCase().includes(args.allocation_name.toLowerCase())
    );
  }
  
  return {
    toolName: 'log_expense',
    args: { ...args, allocation_name: allocation?.name || 'Living' },
    toolCallId,
    description: `Log ₱${args.amount} for "${args.description}"`,
    resolvedData: { allocation },
  };
};
```

### Fuzzy Search for Payments

```typescript
const fuzzyMatch = (name: string, searchTerms: string[]): boolean => {
  const nameLower = name.toLowerCase();
  return searchTerms.some(term => {
    const termLower = term.toLowerCase();
    // Direct substring match
    if (nameLower.includes(termLower)) return true;
    // Word-level matching
    const nameWords = nameLower.split(/[\s\-_]+/);
    return termWords.some(tw => 
      nameWords.some(nw => nw.includes(tw) || tw.includes(nw))
    );
  });
};

// Example: "G Loan" matches "GCash Loan", "G-Loan", etc.
```

---

## Mutation Actions

### FinanceContext Actions

```typescript
interface FinanceContextActions {
  // Creates
  createTransaction: (data) => Promise<Transaction>;
  createMoneyDrop: (data) => Promise<MoneyDrop>;
  createAllocation: (data) => Promise<Allocation>;
  createDebt: (data) => Promise<Debt>;
  createSubscription: (data) => Promise<Subscription>;
  
  // Updates
  updateAllocationBalance: (id, newBalance) => Promise<void>;
  updateDebtRemaining: (id, newRemaining) => Promise<void>;
  updateDebt: (id, data) => Promise<void>;
  updateSubscription: (id, data) => Promise<void>;
  updateMoneyDrop: (id, data) => Promise<void>;
  updateAllocation: (id, data) => Promise<void>;
  
  // Deletes
  deleteDebt: (id) => Promise<void>;
  deleteSubscription: (id) => Promise<void>;
  deleteTransaction: (id) => Promise<void>;
  deleteAllocation: (id) => Promise<void>;
  deleteMoneyDrop: (id) => Promise<void>;
  
  // Refresh
  refetch: () => void;
}
```

### Mutation Pattern

All mutations follow the same offline-first pattern:

```typescript
const updateAllocationBalance = async (id, newBalance) => {
  // 1. Optimistic local update
  setAllocations(prev => prev.map(a => 
    a.id === id ? { ...a, current_balance: newBalance } : a
  ));
  
  // 2. Check online status
  if (!navigator.onLine) {
    await addPendingOperation('allocations', 'update', { 
      id, 
      current_balance: newBalance 
    });
    return;
  }
  
  // 3. Try remote update
  try {
    await pb.collection('allocations').update(id, { 
      current_balance: newBalance 
    });
    await fetchData(); // Refresh
  } catch (err) {
    // Queue for sync
    await addPendingOperation('allocations', 'update', { 
      id, 
      current_balance: newBalance 
    });
  }
};
```

---

## PocketBase Collections

### Required Collections

| Collection | Fields |
|------------|--------|
| `money_drops` | id, name, amount, date, is_received, type, period_start, period_end |
| `allocations` | id, name, type, total_budget, current_balance, is_strict, money_drop_id, linked_debt_id, linked_subscription_id |
| `transactions` | id, amount, description, transaction_date, allocation_id |
| `debts` | id, name, total_amount, remaining_amount, priority, due_date, notes |
| `subscriptions` | id, name, amount, billing_day, category, is_active, end_on_date |
| `budget_templates` | id, name, allocation_rules, salary |

### Type Mapping

```typescript
// PB 'type' → UI 'category'
function typeToCategory(type: AllocationType): AllocationCategory {
  switch (type) {
    case 'wallet': return 'living';
    case 'bill': return 'bills';
    case 'debt': return 'debt';
    case 'savings': return 'savings';
    default: return 'living';
  }
}

// Special case: wallet with name containing 'play' → 'play' category
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/components/Finance.tsx` | Main finance page |
| `src/contexts/FinanceContext.tsx` | Finance state & actions |
| `src/contexts/FinanceToolsContext.tsx` | AI tool handlers |
| `src/components/FinanceVoiceOverlay.tsx` | Voice mode overlay |
| `src/utils/financeTypes.ts` | Types, transforms, helpers |
| `src/utils/offlineCache.ts` | IndexedDB operations |
| `src/contexts/SyncContext.tsx` | Sync status & operations |
| `src/components/modals/*.tsx` | Confirmation modals |

---

## Example Flows

### Logging an Expense (Voice)

```
User: "I spent 200 on coffee"

1. Gemini calls log_expense({
     amount: 200,
     description: "coffee"
   })

2. FinanceToolsContext.executeFinanceTool()
   - Resolves allocation to "Living" wallet
   - Creates pending action

3. ExpenseConfirmationModal appears:
   "Log ₱200 for 'coffee' from Living wallet"

4. User confirms

5. confirmPendingAction():
   - createTransaction({ amount: 200, ... })
   - updateAllocationBalance(livingId, balance - 200)
   - Returns "Logged ₱200 for coffee..."

6. Navi speaks confirmation
```

### Paying a Bill (Voice)

```
User: "Pay my Netflix bill"

1. Gemini calls pay_bill({
     bill_name: "Netflix",
     search_terms: ["Netflix", "streaming", "video"]
   })

2. Fuzzy match finds:
   - Subscription: "Netflix Premium" (₱549)
   - Allocation: "Netflix" (₱549 balance)

3. PaymentModal appears:
   "Pay Netflix Premium - ₱549"

4. User confirms

5. Actions:
   - Update allocation balance to ₱0
   - Create transaction record
   - Return success to Gemini

6. Mission card moves to "Completed"
```

### Offline Expense

```
1. User is offline
2. Logs expense via voice
3. Confirmation modal appears
4. User confirms

5. Optimistic updates:
   - Transaction added to local state
   - Allocation balance reduced
   - UI updates immediately

6. Pending operation queued:
   {
     collection: 'transactions',
     operation: 'create',
     data: { amount: 200, ... },
     localId: 'txn_123456_abc'
   }

7. User comes back online
8. SyncContext.triggerSync():
   - Creates transaction in PocketBase
   - Removes pending operation
   - Shows "Synced 1 change" toast
```
