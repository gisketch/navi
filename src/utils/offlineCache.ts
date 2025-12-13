/**
 * Offline Cache System
 * 
 * Uses IndexedDB to store local copies of all data and pending operations.
 * Provides conflict resolution using "latest timestamp wins" strategy.
 */

import type {
  MoneyDrop,
  Debt,
  Subscription,
  Allocation,
  Transaction,
  BudgetTemplate,
} from './financeTypes';
import type { OvernightCard, DailySummary } from './constants';

// ============================================
// Types
// ============================================

export type CollectionName = 
  | 'money_drops' 
  | 'debts' 
  | 'subscriptions' 
  | 'allocations' 
  | 'transactions' 
  | 'budget_templates'
  | 'overnight_cards'
  | 'daily_summaries';

export type OperationType = 'create' | 'update' | 'delete';

export interface PendingOperation {
  id: string;
  collection: CollectionName;
  operation: OperationType;
  data: Record<string, unknown>;
  timestamp: number;
  localId?: string; // For creates, the temporary local ID
}

export interface CacheMetadata {
  lastSyncTime: number;
  version: number;
}

export interface FinanceCache {
  moneyDrops: MoneyDrop[];
  debts: Debt[];
  subscriptions: Subscription[];
  allocations: Allocation[];
  transactions: Transaction[];
  budgetTemplates: BudgetTemplate[];
}

export interface DashboardCache {
  overnightCards: OvernightCard[];
  dailySummary: DailySummary | null;
}

// ============================================
// IndexedDB Setup
// ============================================

const DB_NAME = 'navi_offline_cache';
const DB_VERSION = 1;

const STORES = {
  FINANCE: 'finance_cache',
  DASHBOARD: 'dashboard_cache',
  PENDING_OPS: 'pending_operations',
  METADATA: 'cache_metadata',
} as const;

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Finance data store
      if (!db.objectStoreNames.contains(STORES.FINANCE)) {
        db.createObjectStore(STORES.FINANCE, { keyPath: 'id' });
      }

      // Dashboard data store
      if (!db.objectStoreNames.contains(STORES.DASHBOARD)) {
        db.createObjectStore(STORES.DASHBOARD, { keyPath: 'id' });
      }

      // Pending operations store
      if (!db.objectStoreNames.contains(STORES.PENDING_OPS)) {
        const store = db.createObjectStore(STORES.PENDING_OPS, { keyPath: 'id' });
        store.createIndex('collection', 'collection', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Metadata store
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
      }
    };
  });
}

// ============================================
// Generic Store Operations
// ============================================

async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function putInStore<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// Finance Cache Operations
// ============================================

const FINANCE_CACHE_KEY = 'finance_data';

export async function saveFinanceCache(data: FinanceCache): Promise<void> {
  await putInStore(STORES.FINANCE, { id: FINANCE_CACHE_KEY, ...data });
  await updateMetadata({ lastSyncTime: Date.now() });
}

export async function getFinanceCache(): Promise<FinanceCache | null> {
  const result = await getFromStore<FinanceCache & { id: string }>(STORES.FINANCE, FINANCE_CACHE_KEY);
  if (!result) return null;
  
  // Remove the id key before returning
  const { id: _, ...cache } = result;
  return cache as FinanceCache;
}

// ============================================
// Dashboard Cache Operations
// ============================================

const DASHBOARD_CACHE_KEY = 'dashboard_data';

export async function saveDashboardCache(data: DashboardCache): Promise<void> {
  await putInStore(STORES.DASHBOARD, { id: DASHBOARD_CACHE_KEY, ...data });
}

export async function getDashboardCache(): Promise<DashboardCache | null> {
  const result = await getFromStore<DashboardCache & { id: string }>(STORES.DASHBOARD, DASHBOARD_CACHE_KEY);
  if (!result) return null;
  
  const { id: _, ...cache } = result;
  return cache as DashboardCache;
}

// ============================================
// Pending Operations
// ============================================

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

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const ops = await getAllFromStore<PendingOperation>(STORES.PENDING_OPS);
  // Sort by timestamp (oldest first for proper ordering)
  return ops.sort((a, b) => a.timestamp - b.timestamp);
}

export async function removePendingOperation(opId: string): Promise<void> {
  await deleteFromStore(STORES.PENDING_OPS, opId);
}

export async function clearPendingOperations(): Promise<void> {
  await clearStore(STORES.PENDING_OPS);
}

export async function hasPendingOperations(): Promise<boolean> {
  const ops = await getPendingOperations();
  return ops.length > 0;
}

// ============================================
// Metadata Operations
// ============================================

const METADATA_KEY = 'cache_meta';

async function updateMetadata(updates: Partial<CacheMetadata>): Promise<void> {
  const existing = await getFromStore<CacheMetadata & { id: string }>(STORES.METADATA, METADATA_KEY);
  const newMeta = {
    id: METADATA_KEY,
    lastSyncTime: existing?.lastSyncTime || 0,
    version: existing?.version || 1,
    ...updates,
  };
  await putInStore(STORES.METADATA, newMeta);
}

export async function getLastSyncTime(): Promise<number> {
  const meta = await getFromStore<CacheMetadata & { id: string }>(STORES.METADATA, METADATA_KEY);
  return meta?.lastSyncTime || 0;
}

// ============================================
// Helper: Generate local ID for offline creates
// ============================================

export function generateLocalId(prefix: string = 'local'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Helper: Check if ID is a local (offline) ID
// ============================================

export function isLocalId(id: string): boolean {
  return id.startsWith('local_') || id.startsWith('op_');
}

// ============================================
// Clear all cache (for debugging/reset)
// ============================================

export async function clearAllCache(): Promise<void> {
  await clearStore(STORES.FINANCE);
  await clearStore(STORES.DASHBOARD);
  await clearStore(STORES.PENDING_OPS);
  await clearStore(STORES.METADATA);
}
