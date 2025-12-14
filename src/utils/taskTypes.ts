/**
 * Task Types for ADHD-First Focus System
 * 
 * Architecture:
 * - Tasks: Atomic units of work with clear status tracking
 * - Categories: Work vs Personal (prevents context collapse)
 * - Status: Only ONE task per category can be 'in_progress'
 * - Obsidian Integration: Tasks link to markdown files via slug
 */

// ============================================
// Types
// ============================================

export type TaskCategory = 'work' | 'personal';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';

// ============================================
// Core Interfaces
// ============================================

/**
 * Task - The core unit of work
 * Designed for ADHD brains with clear "doing now" focus
 */
export interface Task {
  id: string;
  title: string;
  slug: string; // kebab-case for Obsidian filename
  category: TaskCategory;
  status: TaskStatus;
  content?: string; // Brief description or context
  deadline?: string; // ISO date - "plan to finish on"
  started_at?: string; // ISO date - when "Start Action" was clicked
  completed_at?: string; // ISO date - when marked done
  obsidian_path: string; // Where the file lives in Obsidian (default: "Inbox/")
  sort_order: number; // Manual sort order for drag-drop (lower = higher priority)
  created?: string; // ISO date - creation timestamp
  updated?: string; // ISO date - last update timestamp
}

/**
 * Raw task from PocketBase (before transformation)
 */
export interface TaskRaw {
  id: string;
  title: string;
  slug: string;
  category: TaskCategory;
  status: TaskStatus;
  content?: string;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  obsidian_path: string;
  sort_order?: number;
  created: string;
  updated: string;
}

// ============================================
// Task Cache for offline support
// ============================================

export interface TaskCache {
  tasks: Task[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate slug from title (kebab-case)
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Transform PocketBase record to Task
 */
export function transformTask(raw: TaskRaw): Task {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    category: raw.category,
    status: raw.status,
    content: raw.content,
    deadline: raw.deadline,
    started_at: raw.started_at,
    completed_at: raw.completed_at,
    obsidian_path: raw.obsidian_path || 'Inbox/',
    sort_order: raw.sort_order ?? 999999, // Default high number for unsorted
    created: raw.created,
    updated: raw.updated,
  };
}

/**
 * Prepare task data for PocketBase create/update
 */
export function prepareTaskForPB(task: Partial<Task>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  
  if (task.title !== undefined) data.title = task.title;
  if (task.slug !== undefined) data.slug = task.slug;
  if (task.category !== undefined) data.category = task.category;
  if (task.status !== undefined) data.status = task.status;
  if (task.content !== undefined) data.content = task.content;
  if (task.deadline !== undefined) data.deadline = task.deadline || null;
  if (task.started_at !== undefined) data.started_at = task.started_at || null;
  if (task.completed_at !== undefined) data.completed_at = task.completed_at || null;
  if (task.obsidian_path !== undefined) data.obsidian_path = task.obsidian_path;
  if (task.sort_order !== undefined) data.sort_order = task.sort_order;
  
  return data;
}

/**
 * Get Obsidian URI for opening a task's note
 * Note: obsidian_path now contains the full path from webhook (e.g., "07-navi/tasks/work/0001-task-slug.md")
 * Fallback to old format if obsidian_path looks like a folder path
 */
export function getObsidianUri(task: Task, vaultName: string = 'gisketch'): string {
  // If obsidian_path ends with .md, it's the full file path from webhook
  // Otherwise, it's the old folder format, so append slug
  const filePath = task.obsidian_path.endsWith('.md') 
    ? task.obsidian_path.replace(/\.md$/, '') // Remove .md for Obsidian URI
    : `${task.obsidian_path}${task.slug}`;
  
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
}

/**
 * Calculate elapsed time since task started (in minutes)
 */
export function getElapsedMinutes(task: Task): number {
  if (!task.started_at) return 0;
  const startTime = new Date(task.started_at).getTime();
  const now = Date.now();
  return Math.floor((now - startTime) / (1000 * 60));
}

/**
 * Format elapsed time as human-readable string
 */
export function formatElapsedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a task is overdue
 */
export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'done' || task.status === 'archived') {
    return false;
  }
  const deadlineDate = new Date(task.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

/**
 * Sort tasks by priority for display
 * Order: in_progress first, then by sort_order (manual), then by deadline, then by created date
 */
export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // In progress always first
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
    
    // Then by sort_order (manual drag-drop order)
    const aOrder = a.sort_order ?? 999999;
    const bOrder = b.sort_order ?? 999999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Then by deadline (tasks with deadlines before those without)
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline) {
      const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (diff !== 0) return diff;
    }
    
    // Finally by created date (oldest first)
    const aCreated = a.created ? new Date(a.created).getTime() : 0;
    const bCreated = b.created ? new Date(b.created).getTime() : 0;
    return aCreated - bCreated;
  });
}
