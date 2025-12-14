/**
 * Task Tools Context - ADHD-First Focus System
 * 
 * Handles AI tool execution for task management.
 * Similar to FinanceToolsContext but for tasks.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useTaskData } from './TaskContext';
import { useFunctionCallLogs } from './FunctionCallLogContext';
import type { Task, TaskCategory } from '../utils/taskTypes';
import { generateSlug, sortTasksForDisplay } from '../utils/taskTypes';

// ============================================
// Types for Task Tool Actions
// ============================================

export type TaskToolName = 
  | 'get_tasks'
  | 'get_current_task'
  | 'add_task'
  | 'start_task'
  | 'complete_task'
  | 'pause_task';

export interface TaskToolArgs {
  get_tasks: {
    category?: TaskCategory;
    include_completed?: boolean;
  };
  get_current_task: {
    category?: TaskCategory;
  };
  add_task: {
    title: string;
    category: TaskCategory;
    content?: string;
    deadline?: string;
  };
  start_task: {
    task_name: string;
    search_terms?: string[];
  };
  complete_task: {
    task_name: string;
    search_terms?: string[];
  };
  pause_task: {
    task_name?: string;
  };
}

// Tools that require user confirmation before execution
export const TASK_CONFIRMATION_REQUIRED_TOOLS: TaskToolName[] = [
  'add_task',
  'start_task',
  'complete_task',
];

export interface PendingTaskAction<T extends TaskToolName = TaskToolName> {
  toolName: T;
  args: TaskToolArgs[T];
  toolCallId: string;
  description: string; // Human-readable description
  resolvedData?: {
    task?: Task;
  };
  // For multiple match selection
  multipleMatches?: {
    matches: Array<{ id: string; title: string; category: TaskCategory }>;
  };
}

interface TaskToolsContextType {
  // Pending confirmation state
  pendingAction: PendingTaskAction | null;
  
  // Actions
  executeTaskTool: <T extends TaskToolName>(
    toolName: T,
    args: TaskToolArgs[T],
    toolCallId: string
  ) => Promise<{ needsConfirmation: boolean; result?: string }>;
  
  confirmPendingAction: () => Promise<string>;
  cancelPendingAction: () => string;
  clearPendingAction: () => void;
  selectMatch: (matchId: string) => void;
}

const TaskToolsContext = createContext<TaskToolsContextType | null>(null);

export function useTaskTools(): TaskToolsContextType {
  const context = useContext(TaskToolsContext);
  if (!context) {
    throw new Error('useTaskTools must be used within a TaskToolsProvider');
  }
  return context;
}

export function TaskToolsProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<PendingTaskAction | null>(null);
  
  const { addLog } = useFunctionCallLogs();
  
  const {
    tasks,
    currentWorkTask,
    currentPersonalTask,
    workTodoTasks,
    personalTodoTasks,
    createTask,
    startTask,
    pauseTask,
    completeTask,
  } = useTaskData();

  // ============================================
  // Read-Only Tool Executors
  // ============================================

  const executeGetTasks = useCallback((args: TaskToolArgs['get_tasks']): string => {
    let filteredTasks = [...tasks];
    
    // Filter by category
    if (args.category) {
      filteredTasks = filteredTasks.filter(t => t.category === args.category);
    }
    
    // Filter by status
    if (!args.include_completed) {
      filteredTasks = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'archived');
    }
    
    // Sort for display
    filteredTasks = sortTasksForDisplay(filteredTasks);
    
    // Group by category
    const workTasks = filteredTasks.filter(t => t.category === 'work');
    const personalTasks = filteredTasks.filter(t => t.category === 'personal');
    
    return JSON.stringify({
      error: false,
      data: {
        work: {
          current: workTasks.find(t => t.status === 'in_progress') || null,
          todo: workTasks.filter(t => t.status === 'todo').map(t => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
            hasNotes: !!t.content,
          })),
          count: workTasks.length,
        },
        personal: {
          current: personalTasks.find(t => t.status === 'in_progress') || null,
          todo: personalTasks.filter(t => t.status === 'todo').map(t => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
            hasNotes: !!t.content,
          })),
          count: personalTasks.length,
        },
        totalTasks: filteredTasks.length,
      },
    });
  }, [tasks]);

  const executeGetCurrentTask = useCallback((args: TaskToolArgs['get_current_task']): string => {
    const result: { work?: Task | null; personal?: Task | null } = {};
    
    if (!args.category || args.category === 'work') {
      result.work = currentWorkTask;
    }
    if (!args.category || args.category === 'personal') {
      result.personal = currentPersonalTask;
    }
    
    const hasAnyActive = result.work || result.personal;
    
    if (!hasAnyActive) {
      return JSON.stringify({
        error: false,
        message: "No task is currently in progress. Consider starting one from the todo list.",
        data: {
          workTodoCount: workTodoTasks.length,
          personalTodoCount: personalTodoTasks.length,
        },
      });
    }
    
    return JSON.stringify({
      error: false,
      data: {
        work: result.work ? {
          id: result.work.id,
          title: result.work.title,
          content: result.work.content,
          deadline: result.work.deadline,
          started_at: result.work.started_at,
        } : null,
        personal: result.personal ? {
          id: result.personal.id,
          title: result.personal.title,
          content: result.personal.content,
          deadline: result.personal.deadline,
          started_at: result.personal.started_at,
        } : null,
      },
    });
  }, [currentWorkTask, currentPersonalTask, workTodoTasks, personalTodoTasks]);

  // ============================================
  // Helper: Find task by name
  // ============================================

  const findTaskByName = useCallback((
    taskName: string, 
    searchTerms?: string[],
    statusFilter?: ('todo' | 'in_progress')[]
  ): Task[] => {
    const allTerms = [taskName.toLowerCase(), ...(searchTerms || []).map(t => t.toLowerCase())];
    const validStatuses = statusFilter || ['todo', 'in_progress'];
    
    return tasks.filter(t => {
      if (!validStatuses.includes(t.status as any)) return false;
      
      const titleLower = t.title.toLowerCase();
      return allTerms.some(term => titleLower.includes(term) || term.includes(titleLower));
    });
  }, [tasks]);

  // ============================================
  // Write Tool Executors (Prepare for Confirmation)
  // ============================================

  const prepareAddTask = useCallback((
    args: TaskToolArgs['add_task'],
    toolCallId: string
  ): { needsConfirmation: boolean; result?: string } => {
    const description = `Add ${args.category} task: "${args.title}"${args.deadline ? ` (due ${args.deadline})` : ''}`;
    
    setPendingAction({
      toolName: 'add_task',
      args,
      toolCallId,
      description,
    });
    
    return { needsConfirmation: true };
  }, []);

  const prepareStartTask = useCallback((
    args: TaskToolArgs['start_task'],
    toolCallId: string
  ): { needsConfirmation: boolean; result?: string } => {
    const matches = findTaskByName(args.task_name, args.search_terms, ['todo']);
    
    if (matches.length === 0) {
      return {
        needsConfirmation: false,
        result: JSON.stringify({
          error: true,
          message: `No task found matching "${args.task_name}". Maybe create it first?`,
        }),
      };
    }
    
    if (matches.length > 1) {
      setPendingAction({
        toolName: 'start_task',
        args,
        toolCallId,
        description: `Start task: "${args.task_name}"`,
        multipleMatches: {
          matches: matches.map(t => ({
            id: t.id,
            title: t.title,
            category: t.category,
          })),
        },
      });
      return { needsConfirmation: true };
    }
    
    const task = matches[0];
    setPendingAction({
      toolName: 'start_task',
      args,
      toolCallId,
      description: `Start ${task.category} task: "${task.title}"`,
      resolvedData: { task },
    });
    
    return { needsConfirmation: true };
  }, [findTaskByName]);

  const prepareCompleteTask = useCallback((
    args: TaskToolArgs['complete_task'],
    toolCallId: string
  ): { needsConfirmation: boolean; result?: string } => {
    // Special case: "I'm done" without specifying - use current task
    if (args.task_name.toLowerCase() === 'current' || 
        args.task_name.toLowerCase() === 'this' ||
        args.task_name.toLowerCase() === 'that') {
      const currentTask = currentWorkTask || currentPersonalTask;
      if (currentTask) {
        setPendingAction({
          toolName: 'complete_task',
          args: { ...args, task_name: currentTask.title },
          toolCallId,
          description: `Complete ${currentTask.category} task: "${currentTask.title}"`,
          resolvedData: { task: currentTask },
        });
        return { needsConfirmation: true };
      }
    }
    
    const matches = findTaskByName(args.task_name, args.search_terms, ['in_progress', 'todo']);
    
    if (matches.length === 0) {
      return {
        needsConfirmation: false,
        result: JSON.stringify({
          error: true,
          message: `No task found matching "${args.task_name}".`,
        }),
      };
    }
    
    if (matches.length > 1) {
      setPendingAction({
        toolName: 'complete_task',
        args,
        toolCallId,
        description: `Complete task: "${args.task_name}"`,
        multipleMatches: {
          matches: matches.map(t => ({
            id: t.id,
            title: t.title,
            category: t.category,
          })),
        },
      });
      return { needsConfirmation: true };
    }
    
    const task = matches[0];
    setPendingAction({
      toolName: 'complete_task',
      args,
      toolCallId,
      description: `Complete ${task.category} task: "${task.title}"`,
      resolvedData: { task },
    });
    
    return { needsConfirmation: true };
  }, [findTaskByName, currentWorkTask, currentPersonalTask]);

  const executePauseTask = useCallback(async (
    args: TaskToolArgs['pause_task']
  ): Promise<string> => {
    // If no task name, pause current task
    let taskToPause: Task | null = null;
    
    if (!args.task_name) {
      taskToPause = currentWorkTask || currentPersonalTask;
    } else {
      const matches = findTaskByName(args.task_name, [], ['in_progress']);
      if (matches.length > 0) {
        taskToPause = matches[0];
      }
    }
    
    if (!taskToPause) {
      return JSON.stringify({
        error: true,
        message: "No active task to pause.",
      });
    }
    
    await pauseTask(taskToPause.id);
    
    return JSON.stringify({
      error: false,
      message: `Paused "${taskToPause.title}". It's back in your todo list when you're ready.`,
    });
  }, [currentWorkTask, currentPersonalTask, findTaskByName, pauseTask]);

  // ============================================
  // Main Tool Executor
  // ============================================

  const executeTaskTool = useCallback(async <T extends TaskToolName>(
    toolName: T,
    args: TaskToolArgs[T],
    toolCallId: string
  ): Promise<{ needsConfirmation: boolean; result?: string }> => {
    // Log the tool call
    addLog({
      functionName: toolName,
      input: args as Record<string, unknown>,
      output: '',
      success: true,
    });

    switch (toolName) {
      // Read-only tools
      case 'get_tasks':
        return { needsConfirmation: false, result: executeGetTasks(args as TaskToolArgs['get_tasks']) };
      
      case 'get_current_task':
        return { needsConfirmation: false, result: executeGetCurrentTask(args as TaskToolArgs['get_current_task']) };
      
      // Write tools (need confirmation)
      case 'add_task':
        return prepareAddTask(args as TaskToolArgs['add_task'], toolCallId);
      
      case 'start_task':
        return prepareStartTask(args as TaskToolArgs['start_task'], toolCallId);
      
      case 'complete_task':
        return prepareCompleteTask(args as TaskToolArgs['complete_task'], toolCallId);
      
      case 'pause_task':
        // Pause is immediate, no confirmation needed
        return { needsConfirmation: false, result: await executePauseTask(args as TaskToolArgs['pause_task']) };
      
      default:
        return {
          needsConfirmation: false,
          result: JSON.stringify({ error: true, message: `Unknown task tool: ${toolName}` }),
        };
    }
  }, [addLog, executeGetTasks, executeGetCurrentTask, prepareAddTask, prepareStartTask, prepareCompleteTask, executePauseTask]);

  // ============================================
  // Confirmation Actions
  // ============================================

  const confirmPendingAction = useCallback(async (): Promise<string> => {
    if (!pendingAction) {
      return JSON.stringify({ error: true, message: 'No pending action to confirm' });
    }

    try {
      let result: string;

      switch (pendingAction.toolName) {
        case 'add_task': {
          const args = pendingAction.args as TaskToolArgs['add_task'];
          const newTask = await createTask({
            title: args.title,
            slug: generateSlug(args.title),
            category: args.category,
            content: args.content,
            deadline: args.deadline,
            obsidian_path: 'Inbox/',
            status: 'todo',
            sort_order: Date.now(), // New tasks get high sort order (end of list)
          });
          result = JSON.stringify({
            error: false,
            message: `Created ${args.category} task: "${args.title}"`,
            task: { id: newTask.id, title: newTask.title },
          });
          break;
        }

        case 'start_task': {
          const task = pendingAction.resolvedData?.task;
          if (!task) {
            result = JSON.stringify({ error: true, message: 'No task resolved for start' });
            break;
          }
          await startTask(task.id);
          result = JSON.stringify({
            error: false,
            message: `Started "${task.title}". Focus mode activated! 🎯`,
          });
          break;
        }

        case 'complete_task': {
          const task = pendingAction.resolvedData?.task;
          if (!task) {
            result = JSON.stringify({ error: true, message: 'No task resolved for complete' });
            break;
          }
          await completeTask(task.id);
          result = JSON.stringify({
            error: false,
            message: `Completed "${task.title}"! 🎉 Great job!`,
          });
          break;
        }

        default:
          result = JSON.stringify({ error: true, message: 'Unknown pending action type' });
      }

      setPendingAction(null);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      setPendingAction(null);
      return JSON.stringify({ error: true, message: errorMessage });
    }
  }, [pendingAction, createTask, startTask, completeTask]);

  const cancelPendingAction = useCallback((): string => {
    if (!pendingAction) {
      return JSON.stringify({ error: true, message: 'No pending action to cancel' });
    }
    
    const description = pendingAction.description;
    setPendingAction(null);
    return JSON.stringify({
      error: false,
      message: `Cancelled: ${description}`,
    });
  }, [pendingAction]);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const selectMatch = useCallback((matchId: string) => {
    if (!pendingAction?.multipleMatches) return;
    
    const selectedTask = tasks.find(t => t.id === matchId);
    if (!selectedTask) return;
    
    setPendingAction(prev => prev ? {
      ...prev,
      multipleMatches: undefined,
      resolvedData: { task: selectedTask },
      description: `${prev.toolName === 'start_task' ? 'Start' : 'Complete'} ${selectedTask.category} task: "${selectedTask.title}"`,
    } : null);
  }, [pendingAction, tasks]);

  // ============================================
  // Context Value
  // ============================================

  const value: TaskToolsContextType = {
    pendingAction,
    executeTaskTool,
    confirmPendingAction,
    cancelPendingAction,
    clearPendingAction,
    selectMatch,
  };

  return (
    <TaskToolsContext.Provider value={value}>
      {children}
    </TaskToolsContext.Provider>
  );
}
