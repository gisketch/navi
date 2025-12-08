import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// TODO: Save function call logs to PocketBase for persistence across sessions

export interface FunctionCallLog {
  id: string;
  timestamp: string;
  functionName: string;
  input: Record<string, unknown>;
  output: string | Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
}

interface FunctionCallLogContextType {
  logs: FunctionCallLog[];
  addLog: (log: Omit<FunctionCallLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  getLogById: (id: string) => FunctionCallLog | undefined;
}

const STORAGE_KEY = 'navi_function_call_logs';
const MAX_LOGS = 100; // Keep last 100 logs

const FunctionCallLogContext = createContext<FunctionCallLogContextType | null>(null);

export function useFunctionCallLogs(): FunctionCallLogContextType {
  const context = useContext(FunctionCallLogContext);
  if (!context) {
    throw new Error('useFunctionCallLogs must be used within a FunctionCallLogProvider');
  }
  return context;
}

export function FunctionCallLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<FunctionCallLog[]>([]);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLogs(parsed);
        }
      }
    } catch (error) {
      console.error('[FunctionCallLog] Failed to load logs from storage:', error);
    }
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('[FunctionCallLog] Failed to save logs to storage:', error);
    }
  }, [logs]);

  const addLog = useCallback((logData: Omit<FunctionCallLog, 'id' | 'timestamp'>) => {
    const newLog: FunctionCallLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    console.log('[FunctionCallLog] Adding log:', newLog);

    setLogs(prev => {
      const updated = [newLog, ...prev];
      // Keep only the last MAX_LOGS entries
      return updated.slice(0, MAX_LOGS);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getLogById = useCallback((id: string) => {
    return logs.find(log => log.id === id);
  }, [logs]);

  return (
    <FunctionCallLogContext.Provider value={{
      logs,
      addLog,
      clearLogs,
      getLogById,
    }}>
      {children}
    </FunctionCallLogContext.Provider>
  );
}
