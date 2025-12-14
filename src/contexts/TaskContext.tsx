/**
 * Task Context - ADHD-First Focus System
 * 
 * Manages task state with offline support.
 * Key constraint: Only ONE task per category can be 'in_progress' at a time.
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Task, TaskRaw, TaskCache } from '../utils/taskTypes';
import { transformTask, prepareTaskForPB, sortTasksForDisplay } from '../utils/taskTypes';
import { pb } from '../utils/pocketbase';
import {
  saveTaskCache,
  getTaskCache,
  addPendingOperation,
  generateLocalId,
} from '../utils/offlineCache';
import { useSettings } from './SettingsContext';

// ============================================
// Context Type
// ============================================

interface TaskContextType {
  // Core Data
  tasks: Task[];
  
  // Computed (ADHD-friendly getters)
  currentWorkTask: Task | null;
  currentPersonalTask: Task | null;
  workTodoTasks: Task[];
  personalTodoTasks: Task[];
  workDoneTasks: Task[];
  personalDoneTasks: Task[];
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => void;
  createTask: (data: Omit<Task, 'id' | 'created' | 'updated'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // ADHD-specific actions
  startTask: (id: string) => Promise<void>;
  pauseTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function useTaskData(): TaskContextType {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskData must be used within a TaskProvider');
  }
  return context;
}

// ============================================
// Provider
// ============================================

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isUsingCache, setIsUsingCache] = useState(false);
  const cacheUpdateRef = useRef<NodeJS.Timeout | null>(null);
  
  const { obsidianWebhookUrl } = useSettings();

  // ============================================
  // Cache Management
  // ============================================

  const saveToCacheDebounced = useCallback(() => {
    if (cacheUpdateRef.current) {
      clearTimeout(cacheUpdateRef.current);
    }
    cacheUpdateRef.current = setTimeout(() => {
      const cacheData: TaskCache = { tasks };
      saveTaskCache(cacheData).catch(err => 
        console.error('[TaskContext] Failed to save cache:', err)
      );
    }, 500);
  }, [tasks]);

  useEffect(() => {
    if (!isLoading) {
      saveToCacheDebounced();
    }
    return () => {
      if (cacheUpdateRef.current) {
        clearTimeout(cacheUpdateRef.current);
      }
    };
  }, [saveToCacheDebounced, isLoading]);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from PocketBase
      try {
        const tasksRes = await pb.collection('tasks').getFullList({ requestKey: null });
        const newTasks = tasksRes.map(r => transformTask(r as unknown as TaskRaw));
        
        setTasks(newTasks);
        setIsUsingCache(false);

        // Save to cache after successful fetch
        await saveTaskCache({ tasks: newTasks });
        console.log('[TaskContext] Data fetched and cached');
      } catch (fetchErr) {
        // Network error - try to load from cache
        console.log('[TaskContext] Network error, loading from cache...');
        const cached = await getTaskCache();
        
        if (cached) {
          setTasks(cached.tasks);
          setIsUsingCache(true);
          console.log('[TaskContext] Loaded from cache');
        } else {
          // No cache available - start with empty state
          setTasks([]);
          console.log('[TaskContext] No cache, starting empty');
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('autocancelled')) {
        setIsLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Computed Values (ADHD-friendly)
  // ============================================

  // Current task being worked on (per category)
  const currentWorkTask = useMemo(() => 
    tasks.find(t => t.category === 'work' && t.status === 'in_progress') || null
  , [tasks]);

  const currentPersonalTask = useMemo(() => 
    tasks.find(t => t.category === 'personal' && t.status === 'in_progress') || null
  , [tasks]);

  // Todo tasks (sorted for display)
  const workTodoTasks = useMemo(() => 
    sortTasksForDisplay(tasks.filter(t => t.category === 'work' && t.status === 'todo'))
  , [tasks]);

  const personalTodoTasks = useMemo(() => 
    sortTasksForDisplay(tasks.filter(t => t.category === 'personal' && t.status === 'todo'))
  , [tasks]);

  // Done tasks (recent first, limited)
  const workDoneTasks = useMemo(() => 
    tasks
      .filter(t => t.category === 'work' && t.status === 'done')
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bTime - aTime; // Most recent first
      })
      .slice(0, 10) // Limit to 10
  , [tasks]);

  const personalDoneTasks = useMemo(() => 
    tasks
      .filter(t => t.category === 'personal' && t.status === 'done')
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10)
  , [tasks]);

  // ============================================
  // Helper Functions
  // ============================================

  const isOnline = () => navigator.onLine;

  // Trigger n8n webhook to create Obsidian file
  const triggerObsidianFileCreation = useCallback(async (task: Task) => {
    if (!obsidianWebhookUrl) {
      console.log('[TaskContext] No Obsidian webhook URL configured');
      return;
    }

    try {
      const response = await fetch(obsidianWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task_file',
          file_name: `${task.slug}.md`,
          file_path: `${task.obsidian_path}${task.category === 'work' ? 'Work' : 'Personal'}`,
          title: task.title,
          content: task.content || '',
          deadline: task.deadline,
          category: task.category,
        }),
      });
      
      if (!response.ok) {
        console.error('[TaskContext] Failed to create Obsidian file:', await response.text());
      } else {
        console.log('[TaskContext] Obsidian file creation triggered');
      }
    } catch (err) {
      console.error('[TaskContext] Error triggering Obsidian webhook:', err);
    }
  }, [obsidianWebhookUrl]);

  // ============================================
  // CRUD Actions
  // ============================================

  const createTask = useCallback(async (data: Omit<Task, 'id' | 'created' | 'updated'>): Promise<Task> => {
    const localId = generateLocalId('task');
    const now = new Date().toISOString();
    const newTask: Task = { 
      ...data, 
      id: localId,
      created: now,
      updated: now,
    };
    
    // Update local state immediately
    setTasks(prev => [...prev, newTask]);

    // Trigger Obsidian file creation via n8n
    triggerObsidianFileCreation(newTask);

    if (!isOnline()) {
      const pbData = prepareTaskForPB(data);
      await addPendingOperation('tasks', 'create', pbData, localId);
      return newTask;
    }

    try {
      const pbData = prepareTaskForPB(data);
      const record = await pb.collection('tasks').create(pbData, { requestKey: null });
      
      // Update local state with real ID
      const realTask = transformTask(record as unknown as TaskRaw);
      setTasks(prev => prev.map(t => t.id === localId ? realTask : t));
      
      return realTask;
    } catch (err) {
      const pbData = prepareTaskForPB(data);
      await addPendingOperation('tasks', 'create', pbData, localId);
      return newTask;
    }
  }, [triggerObsidianFileCreation]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>): Promise<void> => {
    // Update local state immediately
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, ...data, updated: new Date().toISOString() } : t
    ));

    if (!isOnline()) {
      const pbData = prepareTaskForPB(data);
      await addPendingOperation('tasks', 'update', { id, ...pbData });
      return;
    }

    try {
      const pbData = prepareTaskForPB(data);
      await pb.collection('tasks').update(id, pbData, { requestKey: null });
    } catch (err) {
      const pbData = prepareTaskForPB(data);
      await addPendingOperation('tasks', 'update', { id, ...pbData });
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    // Update local state immediately
    setTasks(prev => prev.filter(t => t.id !== id));

    if (!isOnline()) {
      await addPendingOperation('tasks', 'delete', { id });
      return;
    }

    try {
      await pb.collection('tasks').delete(id, { requestKey: null });
    } catch (err) {
      await addPendingOperation('tasks', 'delete', { id });
    }
  }, []);

  // ============================================
  // ADHD-Specific Actions
  // ============================================

  /**
   * Start working on a task.
   * IMPORTANT: Only ONE task per category can be in_progress at a time.
   * This will automatically pause any other active task in the same category.
   */
  const startTask = useCallback(async (id: string): Promise<void> => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const now = new Date().toISOString();

    // First, pause any existing in_progress task in the same category
    const existingActive = tasks.find(
      t => t.category === task.category && t.status === 'in_progress' && t.id !== id
    );
    
    if (existingActive) {
      await updateTask(existingActive.id, { 
        status: 'todo',
        // Keep started_at to track total time later
      });
    }

    // Now start this task
    await updateTask(id, {
      status: 'in_progress',
      started_at: now,
    });
  }, [tasks, updateTask]);

  /**
   * Pause a task (set back to todo without clearing started_at)
   */
  const pauseTask = useCallback(async (id: string): Promise<void> => {
    await updateTask(id, {
      status: 'todo',
      // Keep started_at for time tracking
    });
  }, [updateTask]);

  /**
   * Mark a task as complete
   */
  const completeTask = useCallback(async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await updateTask(id, {
      status: 'done',
      completed_at: now,
    });
  }, [updateTask]);

  /**
   * Archive a task (hide from main view)
   */
  const archiveTask = useCallback(async (id: string): Promise<void> => {
    await updateTask(id, {
      status: 'archived',
    });
  }, [updateTask]);

  // ============================================
  // Context Value
  // ============================================

  const value: TaskContextType = useMemo(() => ({
    tasks,
    currentWorkTask,
    currentPersonalTask,
    workTodoTasks,
    personalTodoTasks,
    workDoneTasks,
    personalDoneTasks,
    isLoading,
    error,
    refetch: fetchData,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    completeTask,
    archiveTask,
  }), [
    tasks,
    currentWorkTask,
    currentPersonalTask,
    workTodoTasks,
    personalTodoTasks,
    workDoneTasks,
    personalDoneTasks,
    isLoading,
    error,
    fetchData,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    completeTask,
    archiveTask,
  ]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}
