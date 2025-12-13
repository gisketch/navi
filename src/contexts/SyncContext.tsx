/**
 * Sync Context
 * 
 * Manages the synchronization state between local cache and remote PocketBase.
 * Provides sync status for UI (online, syncing, offline) and handles
 * syncing pending operations when coming back online.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { pb } from '../utils/pocketbase';
import {
  getPendingOperations,
  removePendingOperation,
  hasPendingOperations,
  getLastSyncTime,
  type PendingOperation,
  type CollectionName,
} from '../utils/offlineCache';

// ============================================
// Types
// ============================================

export type SyncStatus = 'online' | 'syncing' | 'offline';

interface SyncContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  hasPendingChanges: boolean;
  pendingCount: number;
  lastSyncTime: number;
  triggerSync: () => Promise<void>;
  error: string | null;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function useSyncStatus(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
}

// ============================================
// Sync Provider
// ============================================

interface SyncProviderProps {
  children: ReactNode;
  onSyncComplete?: () => void; // Callback to refetch data after sync
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void; // Toast callback
}

export function SyncProvider({ children, onSyncComplete, onShowToast }: SyncProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'online' : 'offline');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous online state to detect transitions
  const wasOfflineRef = React.useRef(!navigator.onLine);

  // Check for pending operations
  const checkPendingOperations = useCallback(async () => {
    try {
      const pending = await hasPendingOperations();
      const ops = await getPendingOperations();
      setHasPendingChanges(pending);
      setPendingCount(ops.length);
    } catch (err) {
      console.error('[Sync] Error checking pending operations:', err);
    }
  }, []);

  // Load last sync time
  const loadLastSyncTime = useCallback(async () => {
    try {
      const time = await getLastSyncTime();
      setLastSyncTime(time);
    } catch (err) {
      console.error('[Sync] Error loading last sync time:', err);
    }
  }, []);

  // Sync a single operation to PocketBase
  const syncOperation = async (op: PendingOperation): Promise<boolean> => {
    const { collection, operation, data } = op;
    
    try {
      console.log(`[Sync] Processing ${operation} on ${collection}:`, data);

      // Map collection names
      const pbCollection = collection as CollectionName;

      switch (operation) {
        case 'create': {
          // Remove local ID before sending to PB
          const createData = { ...data };
          delete createData.id;
          
          const record = await pb.collection(pbCollection).create(createData, { requestKey: null });
          console.log(`[Sync] Created ${collection} with ID:`, record.id);
          break;
        }
        
        case 'update': {
          const id = data.id as string;
          if (!id) {
            console.error('[Sync] Update operation missing ID');
            return false;
          }
          
          // Check if this is a local ID (created offline) - skip if so
          if (id.startsWith('local_')) {
            console.log('[Sync] Skipping update for local ID:', id);
            return true; // Remove the operation, it's invalid
          }
          
          const updateData = { ...data };
          delete updateData.id;
          
          await pb.collection(pbCollection).update(id, updateData, { requestKey: null });
          console.log(`[Sync] Updated ${collection}:`, id);
          break;
        }
        
        case 'delete': {
          const id = data.id as string;
          if (!id) {
            console.error('[Sync] Delete operation missing ID');
            return false;
          }
          
          // Skip deleting local IDs
          if (id.startsWith('local_')) {
            console.log('[Sync] Skipping delete for local ID:', id);
            return true;
          }
          
          try {
            await pb.collection(pbCollection).delete(id, { requestKey: null });
            console.log(`[Sync] Deleted ${collection}:`, id);
          } catch (err: any) {
            // If record doesn't exist (404), that's fine - it's already deleted
            if (err?.status === 404) {
              console.log(`[Sync] Record already deleted: ${id}`);
            } else {
              throw err;
            }
          }
          break;
        }
      }
      
      return true;
    } catch (err) {
      console.error(`[Sync] Failed to sync operation:`, op, err);
      return false;
    }
  };

  // Main sync function
  const triggerSync = useCallback(async () => {
    // Use navigator.onLine directly to avoid stale closure state
    if (!navigator.onLine) {
      console.log('[Sync] Cannot sync while offline');
      return;
    }

    const pending = await hasPendingOperations();
    if (!pending) {
      console.log('[Sync] No pending operations to sync');
      setSyncStatus('online');
      return;
    }

    setSyncStatus('syncing');
    setError(null);

    try {
      const operations = await getPendingOperations();
      console.log(`[Sync] Starting sync of ${operations.length} operations...`);

      let successCount = 0;
      let failCount = 0;

      for (const op of operations) {
        const success = await syncOperation(op);
        
        if (success) {
          await removePendingOperation(op.id);
          successCount++;
        } else {
          failCount++;
          // Don't remove failed operations - they'll retry on next sync
        }
        
        // Update pending count as we go
        await checkPendingOperations();
      }

      console.log(`[Sync] Complete. Success: ${successCount}, Failed: ${failCount}`);

      if (failCount > 0) {
        setError(`${failCount} operations failed to sync`);
        onShowToast?.(`${failCount} changes failed to sync`, 'error');
      } else if (successCount > 0) {
        onShowToast?.(`Synced ${successCount} change${successCount > 1 ? 's' : ''} to database`, 'success');
      }

      // Trigger data refetch after successful sync
      if (successCount > 0 && onSyncComplete) {
        onSyncComplete();
      }

      // Update last sync time
      await loadLastSyncTime();
      
    } catch (err) {
      console.error('[Sync] Error during sync:', err);
      setError('Sync failed. Will retry when online.');
    } finally {
      // Check if there are still pending operations
      const stillPending = await hasPendingOperations();
      setSyncStatus(stillPending ? 'syncing' : 'online');
    }
  }, [checkPendingOperations, loadLastSyncTime, onSyncComplete, onShowToast]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Network came online');
      setIsOnline(true);
      
      // Show toast when coming back online
      if (wasOfflineRef.current) {
        onShowToast?.('Back online!', 'success');
        wasOfflineRef.current = false;
      }
      
      // Don't immediately set to 'online' - check for pending first
      checkPendingOperations().then(async () => {
        const pending = await hasPendingOperations();
        if (pending) {
          onShowToast?.('Syncing offline changes...', 'info');
          // Auto-trigger sync when coming back online
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

    // Initial check
    checkPendingOperations();
    loadLastSyncTime();

    // If online and have pending ops, start syncing
    if (navigator.onLine) {
      hasPendingOperations().then(pending => {
        if (pending) {
          triggerSync();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkPendingOperations, loadLastSyncTime, triggerSync, onShowToast]);

  // Periodically check for pending operations (in case they were added elsewhere)
  useEffect(() => {
    const interval = setInterval(() => {
      checkPendingOperations();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [checkPendingOperations]);

  const value: SyncContextType = {
    isOnline,
    syncStatus,
    hasPendingChanges,
    pendingCount,
    lastSyncTime,
    triggerSync,
    error,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}
