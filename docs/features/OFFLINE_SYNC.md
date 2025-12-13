# Offline Syncing Mechanism Documentation

Navi implements a comprehensive **offline-first architecture** that allows users to perform all CRUD operations without an internet connection, with automatic synchronization when connectivity is restored.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [IndexedDB Storage](#indexeddb-storage)
4. [Offline Cache Operations](#offline-cache-operations)
5. [Pending Operations Queue](#pending-operations-queue)
6. [Sync Context](#sync-context)
7. [Conflict Resolution](#conflict-resolution)
8. [Sync Flow](#sync-flow)
9. [UI Indicators](#ui-indicators)
10. [Error Handling](#error-handling)

---

## Overview

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Optimistic Updates** | UI updates immediately, syncs later |
| **Local-First** | Data always saved locally first |
| **Automatic Sync** | Syncs when back online without user action |
| **Conflict Resolution** | Latest timestamp wins |
| **Graceful Degradation** | Works fully offline, mock data fallback |

### What Can Work Offline?

| Feature | Read | Create | Update | Delete |
|---------|------|--------|--------|--------|
| Finance (transactions, allocations) | ✅ | ✅ | ✅ | ✅ |
| Dashboard (overnight cards) | ✅ | ❌ | ❌ | ❌ |
| Chat (cached messages) | ❌ | ❌ | - | - |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Components                         │ │
│  │     Finance.tsx    Dashboard.tsx    ChatUI.tsx             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Contexts                               │ │
│  │  FinanceContext          SyncContext                        │ │
│  │  (Data + Actions)        (Sync Status + Operations)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          ▼                   ▼                   ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  PocketBase  │   │  IndexedDB   │   │   Network    │        │
│  │  (Remote)    │   │  (Local)     │   │   Status     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│          │                   │                   │              │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   offlineCache.ts                        │   │
│  │  - saveFinanceCache()     - addPendingOperation()       │   │
│  │  - getFinanceCache()      - getPendingOperations()      │   │
│  │  - saveDashboardCache()   - removePendingOperation()    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## IndexedDB Storage

### Database Configuration

```typescript
const DB_NAME = 'navi_offline_cache';
const DB_VERSION = 1;

const STORES = {
  FINANCE: 'finance_cache',       // Finance data snapshot
  DASHBOARD: 'dashboard_cache',   // Dashboard data snapshot
  PENDING_OPS: 'pending_operations', // Queued write operations
  METADATA: 'cache_metadata',     // Sync timestamps, version
};
```

### Store Schemas

#### Finance Cache Store

```typescript
interface FinanceCache {
  id: 'finance_data';  // Single record
  moneyDrops: MoneyDrop[];
  debts: Debt[];
  subscriptions: Subscription[];
  allocations: Allocation[];
  transactions: Transaction[];
  budgetTemplates: BudgetTemplate[];
}
```

#### Dashboard Cache Store

```typescript
interface DashboardCache {
  id: 'dashboard_data';  // Single record
  overnightCards: OvernightCard[];
  dailySummary: DailySummary | null;
}
```

#### Pending Operations Store

```typescript
interface PendingOperation {
  id: string;                    // Unique operation ID
  collection: CollectionName;    // Target collection
  operation: OperationType;      // 'create' | 'update' | 'delete'
  data: Record<string, unknown>; // Operation payload
  timestamp: number;             // When queued
  localId?: string;              // For creates - temporary ID
}

// Indexes:
// - 'collection' (for filtering by collection)
// - 'timestamp' (for ordering)
```

#### Metadata Store

```typescript
interface CacheMetadata {
  id: 'cache_meta';
  lastSyncTime: number;    // Unix timestamp
  version: number;         // Schema version
}
```

---

## Offline Cache Operations

### Database Connection

```typescript
// Singleton connection
let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('finance_cache')) {
        db.createObjectStore('finance_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_operations')) {
        const store = db.createObjectStore('pending_operations', { keyPath: 'id' });
        store.createIndex('collection', 'collection');
        store.createIndex('timestamp', 'timestamp');
      }
      // ... other stores
    };
  });
}
```

### Generic Operations

```typescript
// Get single record
async function getFromStore<T>(storeName: string, key: string): Promise<T | null>;

// Put/upsert record
async function putInStore<T>(storeName: string, data: T): Promise<void>;

// Delete record
async function deleteFromStore(storeName: string, key: string): Promise<void>;

// Get all records
async function getAllFromStore<T>(storeName: string): Promise<T[]>;

// Clear store
async function clearStore(storeName: string): Promise<void>;
```

### Finance Cache Operations

```typescript
// Save entire finance state
export async function saveFinanceCache(data: FinanceCache): Promise<void> {
  await putInStore(STORES.FINANCE, { id: 'finance_data', ...data });
  await updateMetadata({ lastSyncTime: Date.now() });
}

// Retrieve finance state
export async function getFinanceCache(): Promise<FinanceCache | null> {
  const result = await getFromStore<FinanceCache & { id: string }>(
    STORES.FINANCE, 
    'finance_data'
  );
  if (!result) return null;
  
  const { id: _, ...cache } = result;  // Remove internal id
  return cache as FinanceCache;
}
```

### Dashboard Cache Operations

```typescript
export async function saveDashboardCache(data: DashboardCache): Promise<void> {
  await putInStore(STORES.DASHBOARD, { id: 'dashboard_data', ...data });
}

export async function getDashboardCache(): Promise<DashboardCache | null> {
  const result = await getFromStore<DashboardCache & { id: string }>(
    STORES.DASHBOARD, 
    'dashboard_data'
  );
  if (!result) return null;
  
  const { id: _, ...cache } = result;
  return cache as DashboardCache;
}
```

---

## Pending Operations Queue

### Adding Operations

When a write operation fails or happens offline:

```typescript
export async function addPendingOperation(
  collection: CollectionName,
  operation: OperationType,
  data: Record<string, unknown>,
  localId?: string
): Promise<string> {
  const opId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const pendingOp: PendingOperation = {
    id: opId,
    collection,
    operation,
    data,
    timestamp: Date.now(),
    localId,
  };

  await putInStore(STORES.PENDING_OPS, pendingOp);
  return opId;
}
```

### Retrieving Operations

```typescript
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const ops = await getAllFromStore<PendingOperation>(STORES.PENDING_OPS);
  // Sort by timestamp (oldest first for proper ordering)
  return ops.sort((a, b) => a.timestamp - b.timestamp);
}
```

### Removing Operations

After successful sync:

```typescript
export async function removePendingOperation(opId: string): Promise<void> {
  await deleteFromStore(STORES.PENDING_OPS, opId);
}
```

### Helper Functions

```typescript
export async function hasPendingOperations(): Promise<boolean> {
  const ops = await getPendingOperations();
  return ops.length > 0;
}

export function generateLocalId(prefix: string = 'local'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('local_') || id.startsWith('op_');
}
```

---

## Sync Context

The `SyncContext` manages synchronization state and operations.

### State

```typescript
interface SyncContextType {
  isOnline: boolean;          // Current network status
  syncStatus: SyncStatus;     // 'online' | 'syncing' | 'offline'
  hasPendingChanges: boolean; // Any pending operations?
  pendingCount: number;       // Number of pending operations
  lastSyncTime: number;       // Last successful sync timestamp
  triggerSync: () => Promise<void>;  // Manual sync trigger
  error: string | null;       // Last sync error
}

type SyncStatus = 'online' | 'syncing' | 'offline';
```

### Online/Offline Detection

```typescript
useEffect(() => {
  const handleOnline = () => {
    console.log('[Sync] Network came online');
    setIsOnline(true);
    
    // Show toast when coming back online
    if (wasOfflineRef.current) {
      onShowToast?.('Back online!', 'success');
      wasOfflineRef.current = false;
    }
    
    // Check for pending operations and sync
    checkPendingOperations().then(async () => {
      const pending = await hasPendingOperations();
      if (pending) {
        onShowToast?.('Syncing offline changes...', 'info');
        triggerSync();
      } else {
        setSyncStatus('online');
      }
    });
  };

  const handleOffline = () => {
    console.log('[Sync] Network went offline');
    setIsOnline(false);
    setSyncStatus('offline');
    wasOfflineRef.current = true;
    onShowToast?.('You are offline. Changes will sync when back online.', 'info');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### Sync Operation

```typescript
const syncOperation = async (op: PendingOperation): Promise<boolean> => {
  const { collection, operation, data } = op;
  
  try {
    switch (operation) {
      case 'create': {
        // Remove local ID before sending to PocketBase
        const createData = { ...data };
        delete createData.id;
        
        await pb.collection(collection).create(createData, { requestKey: null });
        break;
      }
      
      case 'update': {
        const id = data.id as string;
        
        // Skip local IDs (created offline, not yet synced)
        if (id.startsWith('local_')) {
          console.log('[Sync] Skipping update for local ID:', id);
          return true;  // Remove from queue
        }
        
        const updateData = { ...data };
        delete updateData.id;
        
        await pb.collection(collection).update(id, updateData, { requestKey: null });
        break;
      }
      
      case 'delete': {
        const id = data.id as string;
        
        if (id.startsWith('local_')) {
          return true;  // Skip local IDs
        }
        
        try {
          await pb.collection(collection).delete(id, { requestKey: null });
        } catch (err: any) {
          // 404 = already deleted, that's fine
          if (err?.status !== 404) throw err;
        }
        break;
      }
    }
    
    return true;
  } catch (err) {
    console.error('[Sync] Failed to sync operation:', op, err);
    return false;
  }
};
```

### Main Sync Function

```typescript
const triggerSync = useCallback(async () => {
  if (!navigator.onLine) {
    console.log('[Sync] Cannot sync while offline');
    return;
  }

  const pending = await hasPendingOperations();
  if (!pending) {
    setSyncStatus('online');
    return;
  }

  setSyncStatus('syncing');
  setError(null);

  try {
    const operations = await getPendingOperations();
    console.log(`[Sync] Syncing ${operations.length} operations...`);

    let successCount = 0;
    let failCount = 0;

    for (const op of operations) {
      const success = await syncOperation(op);
      
      if (success) {
        await removePendingOperation(op.id);
        successCount++;
      } else {
        failCount++;
        // Don't remove failed operations - retry next sync
      }
      
      await checkPendingOperations();  // Update count
    }

    console.log(`[Sync] Complete. Success: ${successCount}, Failed: ${failCount}`);

    if (failCount > 0) {
      setError(`${failCount} operations failed to sync`);
      onShowToast?.(`${failCount} changes failed to sync`, 'error');
    } else if (successCount > 0) {
      onShowToast?.(`Synced ${successCount} change${successCount > 1 ? 's' : ''}`, 'success');
    }

    // Trigger data refetch after successful sync
    if (successCount > 0 && onSyncComplete) {
      onSyncComplete();
    }
    
  } finally {
    const stillPending = await hasPendingOperations();
    setSyncStatus(stillPending ? 'syncing' : 'online');
  }
}, []);
```

---

## Conflict Resolution

### Strategy: Latest Timestamp Wins

When syncing updates, the system uses a simple "last write wins" strategy:

```
Local State (modified offline at T1)
    │
    ▼
Sync Attempt
    │
    ├── Server state older than T1 → Local wins, update server
    │
    └── Server state newer than T1 → Conflict! 
                                      Currently: Local overwrites
                                      (Future: Could merge or prompt)
```

### Handling Local IDs

Records created offline get local IDs:

```typescript
// Created offline
{ id: 'local_1702500000000_abc123', amount: 200, ... }

// After sync, server returns real ID
{ id: 'a1b2c3d4e5', amount: 200, ... }
```

The sync process handles this:

1. Create operation uses data without local ID
2. Server returns new ID
3. `fetchData()` refreshes all data with real IDs
4. Local state updates to use real IDs

### Skip Invalid Operations

```typescript
// Skip updates/deletes for local IDs
if (id.startsWith('local_')) {
  console.log('[Sync] Skipping operation for local ID:', id);
  return true;  // Remove from queue (invalid)
}
```

---

## Sync Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Action (e.g., Log Expense)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Generate Local ID                                           │
│     localId = 'txn_1702500000000_abc'                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Optimistic Update (Immediate)                               │
│     - Add transaction to local state                            │
│     - Update allocation balance                                 │
│     - UI reflects change immediately                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Check Online Status                                         │
│     navigator.onLine === true?                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
           ONLINE                          OFFLINE
              │                               │
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│ 4a. Try PocketBase  │           │ 4b. Queue Operation │
│     pb.create(...)  │           │     addPending(     │
└─────────────────────┘           │       'transactions',│
              │                   │       'create',     │
      ┌───────┴───────┐           │       data,         │
      │               │           │       localId       │
   SUCCESS          ERROR         │     )               │
      │               │           └─────────────────────┘
      ▼               ▼                     │
┌───────────┐  ┌───────────────┐           │
│ 5a. Done! │  │ 5b. Queue Op  │           │
│ Refetch   │  │ (same as 4b)  │           │
│ data      │  └───────────────┘           │
└───────────┘          │                   │
                       │                   │
                       ▼                   ▼
              ┌─────────────────────────────────────────┐
              │  Operation in IndexedDB Queue           │
              │  Waiting for network...                 │
              └─────────────────────────────────────────┘
                              │
                              │ (User comes back online)
                              ▼
              ┌─────────────────────────────────────────┐
              │  6. SyncContext detects 'online' event  │
              │     triggerSync() called                │
              └─────────────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────────────┐
              │  7. Process Pending Operations          │
              │     for (op of pendingOps) {            │
              │       syncOperation(op)                 │
              │       removePendingOperation(op.id)     │
              │     }                                   │
              └─────────────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────────────┐
              │  8. Refetch All Data                    │
              │     onSyncComplete() → fetchData()      │
              │     State now has real IDs              │
              └─────────────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────────────┐
              │  9. Show Toast                          │
              │     "Synced 1 change to database"       │
              └─────────────────────────────────────────┘
```

---

## UI Indicators

### Sync Status Display

The `SyncContext` provides status for UI display:

```typescript
// In a component
const { syncStatus, hasPendingChanges, pendingCount } = useSyncStatus();

// Possible displays:
// syncStatus === 'online'    → Green indicator
// syncStatus === 'syncing'   → Yellow/spinning indicator
// syncStatus === 'offline'   → Red/gray indicator

// hasPendingChanges === true → Show pending count badge
```

### Toast Notifications

```typescript
// Coming back online
onShowToast?.('Back online!', 'success');

// Sync starting
onShowToast?.('Syncing offline changes...', 'info');

// Sync complete
onShowToast?.('Synced 3 changes to database', 'success');

// Sync error
onShowToast?.('2 changes failed to sync', 'error');

// Going offline
onShowToast?.('You are offline. Changes will sync when back online.', 'info');
```

### Demo Mode Indicator

When using mock data due to connection failure:

```tsx
{isMock && (
  <span className="text-amber-300/80 bg-amber-500/10 ...">
    Demo Mode
  </span>
)}
```

---

## Error Handling

### Network Errors

```typescript
try {
  await pb.collection('transactions').create(data);
} catch (err) {
  // Could be:
  // - No network
  // - Server error (500)
  // - Auth error (401)
  // - Not found (404)
  
  console.error('[Finance] Network error, queuing for sync');
  await addPendingOperation('transactions', 'create', data, localId);
}
```

### Sync Errors

Failed operations stay in queue:

```typescript
for (const op of operations) {
  const success = await syncOperation(op);
  
  if (success) {
    await removePendingOperation(op.id);
    successCount++;
  } else {
    failCount++;
    // Operation stays in queue for retry
  }
}
```

### Auto-Cancellation Prevention

PocketBase SDK has auto-cancellation that can cause issues:

```typescript
// Use requestKey: null to disable auto-cancellation
await pb.collection('transactions').getFullList({ 
  requestKey: null 
});
```

---

## Best Practices

### 1. Always Use Optimistic Updates

```typescript
// ✅ Correct: Update UI immediately
setTransactions(prev => [...prev, newTransaction]);
// Then try network, queue if fails

// ❌ Wrong: Wait for network
const result = await pb.create(...);
setTransactions(prev => [...prev, result]);
// User waits, UI feels slow
```

### 2. Debounce Cache Saves

```typescript
const saveToCacheDebounced = useCallback(() => {
  if (cacheUpdateRef.current) {
    clearTimeout(cacheUpdateRef.current);
  }
  cacheUpdateRef.current = setTimeout(() => {
    saveFinanceCache(data);
  }, 500);  // 500ms debounce
}, [data]);
```

### 3. Handle Stale Local IDs

```typescript
// When updating, check if ID is local
if (id.startsWith('local_')) {
  // Find by other criteria or skip
  console.log('Skipping local ID update');
  return;
}
```

### 4. Graceful Degradation

```typescript
try {
  // Try network
} catch {
  // Try cache
  const cached = await getFinanceCache();
  if (cached) {
    // Use cached data
  } else {
    // Use mock data
  }
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/utils/offlineCache.ts` | IndexedDB operations |
| `src/contexts/SyncContext.tsx` | Sync state & operations |
| `src/contexts/FinanceContext.tsx` | Finance mutations with offline |
| `src/hooks/useOvernightSummaries.ts` | Dashboard cache |
| `src/hooks/useOnlineStatus.ts` | Online status hook |
