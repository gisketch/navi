/**
 * Focus Page - ADHD-First Todo System
 * 
 * Design principles:
 * - "Doing Now" card takes center stage (visual blindness to clutter)
 * - Work/Personal separation (prevents context collapse)
 * - "Start Action" is a ritual (friction as a feature)
 * - Timer shows elapsed time since started
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Plus, 
  Clock, 
  ExternalLink,
  Briefcase,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useTaskData } from '../contexts/TaskContext';
import { useModal } from '../contexts/ModalContext';
import { GlassContainer } from './Dashboard';
import { cn, glass, rounded } from '../utils/glass';
import type { Task, TaskCategory } from '../utils/taskTypes';
import { formatElapsedTime, isOverdue, getObsidianUri } from '../utils/taskTypes';

interface FocusProps {
  naviPosition?: { x: number; y: number };
}

// ============================================
// Category Tab Toggle
// ============================================
function CategoryToggle({ 
  activeCategory, 
  onCategoryChange 
}: { 
  activeCategory: TaskCategory; 
  onCategoryChange: (cat: TaskCategory) => void;
}) {
  return (
    <div className={cn(
      'flex p-1 gap-1',
      rounded.lg,
      glass.card,
    )}>
      <button
        onClick={() => onCategoryChange('work')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-4 transition-all duration-200',
          rounded.md,
          activeCategory === 'work' 
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
            : 'text-white/50 hover:text-white/70 hover:bg-white/5'
        )}
      >
        <Briefcase className="w-4 h-4" />
        <span className="text-sm font-medium">Work</span>
      </button>
      <button
        onClick={() => onCategoryChange('personal')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-4 transition-all duration-200',
          rounded.md,
          activeCategory === 'personal' 
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
            : 'text-white/50 hover:text-white/70 hover:bg-white/5'
        )}
      >
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">Personal</span>
      </button>
    </div>
  );
}

// ============================================
// Elapsed Timer Component
// ============================================
function ElapsedTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const startTime = new Date(startedAt).getTime();
    setElapsed(Math.floor((Date.now() - startTime) / (1000 * 60)));

    // Update every minute
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / (1000 * 60)));
    }, 60000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-2 text-cyan-400/70">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-mono">{formatElapsedTime(elapsed)}</span>
    </div>
  );
}

// ============================================
// "Doing Now" Card (The Big One)
// ============================================
function DoingNowCard({
  task,
  category,
  naviPosition,
  onPause,
  onComplete,
  onOpenNotes,
}: {
  task: Task | null;
  category: TaskCategory;
  naviPosition?: { x: number; y: number };
  onPause: () => void;
  onComplete: () => void;
  onOpenNotes: () => void;
}) {
  const glowColor = category === 'work' ? 'rgba(34, 211, 238, 0.5)' : 'rgba(168, 85, 247, 0.5)';

  if (!task) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <GlassContainer naviPosition={naviPosition} glowColor={glowColor}>
          <div className="p-8 text-center">
            <div className={cn(
              'w-16 h-16 mx-auto mb-4 flex items-center justify-center',
              rounded.full,
              'bg-white/5 border border-white/10'
            )}>
              <Play className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-xl font-semibold text-white/70 mb-2">No Active Task</h2>
            <p className="text-sm text-white/40">Pick a task below to start focusing</p>
          </div>
        </GlassContainer>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6"
    >
      <GlassContainer naviPosition={naviPosition} glowColor={glowColor}>
        {/* Glow effect */}
        <div 
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 blur-3xl pointer-events-none',
            category === 'work' ? 'bg-cyan-400/20' : 'bg-purple-400/20'
          )} 
        />
        
        {/* Top accent line */}
        <div 
          className={cn(
            'absolute inset-x-0 top-0 h-1 rounded-t-2xl',
            category === 'work' ? 'bg-gradient-to-r from-cyan-500/50 via-cyan-400 to-cyan-500/50' 
                                 : 'bg-gradient-to-r from-purple-500/50 via-purple-400 to-purple-500/50'
          )} 
        />

        <div className="relative p-6">
          {/* Header with timer */}
          <div className="flex items-center justify-between mb-4">
            <span className={cn(
              'text-xs font-medium uppercase tracking-wider',
              category === 'work' ? 'text-cyan-400/70' : 'text-purple-400/70'
            )}>
              Doing Now
            </span>
            <ElapsedTimer startedAt={task.started_at} />
          </div>

          {/* Task title */}
          <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
          
          {/* Task description */}
          {task.content && (
            <p className="text-base text-white/60 mb-4 line-clamp-2">{task.content}</p>
          )}

          {/* Deadline if exists */}
          {task.deadline && (
            <div className={cn(
              'flex items-center gap-2 mb-4 text-sm',
              isOverdue(task) ? 'text-red-400' : 'text-white/50'
            )}>
              <Calendar className="w-4 h-4" />
              <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
              {isOverdue(task) && <AlertCircle className="w-4 h-4" />}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onComplete}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4',
                rounded.lg,
                'bg-emerald-500/20 border border-emerald-500/30',
                'text-emerald-400 font-medium',
                'hover:bg-emerald-500/30 transition-all duration-200',
                'active:scale-[0.98]'
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Done!</span>
            </button>
            
            <button
              onClick={onPause}
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4',
                rounded.lg,
                glass.button,
                'text-white/70 font-medium',
                'hover:bg-white/10 transition-all duration-200',
                'active:scale-[0.98]'
              )}
            >
              <Pause className="w-5 h-5" />
              <span>Pause</span>
            </button>

            <button
              onClick={onOpenNotes}
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4',
                rounded.lg,
                glass.button,
                'text-white/70 font-medium',
                'hover:bg-white/10 transition-all duration-200',
                'active:scale-[0.98]'
              )}
              title="Open in Obsidian"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Task List Item
// ============================================
function TaskListItem({
  task,
  index,
  naviPosition,
  onStart,
  onClick,
}: {
  task: Task;
  index: number;
  naviPosition?: { x: number; y: number };
  onStart: () => void;
  onClick: () => void;
}) {
  const overdue = isOverdue(task);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <GlassContainer
        as="button"
        onClick={onClick}
        naviPosition={naviPosition}
        glowColor="rgba(34, 211, 238, 0.3)"
        className="w-full text-left"
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Start button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className={cn(
                'shrink-0 p-3',
                rounded.lg,
                'bg-cyan-500/10 border border-cyan-500/20',
                'text-cyan-400',
                'hover:bg-cyan-500/20 transition-all duration-200',
                'active:scale-95'
              )}
              title="Start working on this"
            >
              <Play className="w-5 h-5" />
            </button>

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-white truncate">{task.title}</h3>
              {task.deadline && (
                <div className={cn(
                  'flex items-center gap-1 mt-1 text-xs',
                  overdue ? 'text-red-400' : 'text-white/40'
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.deadline).toLocaleDateString()}</span>
                  {overdue && <span className="font-medium">(overdue)</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Done Task Item (compact)
// ============================================
function DoneTaskItem({ task }: { task: Task }) {
  return (
    <div className={cn(
      'flex items-center gap-3 py-2 px-3',
      rounded.md,
      'bg-white/[0.02]'
    )}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400/50 shrink-0" />
      <span className="text-sm text-white/40 truncate line-through">{task.title}</span>
      {task.completed_at && (
        <span className="text-xs text-white/20 shrink-0">
          {new Date(task.completed_at).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

// ============================================
// Main Focus Component
// ============================================
export function Focus({ naviPosition }: FocusProps) {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('work');
  const { openTaskInput, openTaskDetail } = useModal();
  
  const {
    currentWorkTask,
    currentPersonalTask,
    workTodoTasks,
    personalTodoTasks,
    workDoneTasks,
    personalDoneTasks,
    isLoading,
    startTask,
    pauseTask,
    completeTask,
  } = useTaskData();

  // Get current task based on category
  const currentTask = activeCategory === 'work' ? currentWorkTask : currentPersonalTask;
  const todoTasks = activeCategory === 'work' ? workTodoTasks : personalTodoTasks;
  const doneTasks = activeCategory === 'work' ? workDoneTasks : personalDoneTasks;

  // Handle opening Obsidian
  const handleOpenNotes = (task: Task) => {
    const uri = getObsidianUri(task);
    window.open(uri, '_blank');
  };

  // Handle task detail click
  const handleTaskClick = (task: Task) => {
    openTaskDetail(task);
  };

  // Handle create new task
  const handleCreateTask = () => {
    openTaskInput(activeCategory);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-white/50">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ===== STATIC TOP SECTION ===== */}
      <div className="flex-shrink-0 px-5 lg:px-8">
        {/* Header */}
        <header
          className="pb-4 touch-none"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 36px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Focus</h1>
            <p className="text-sm text-white/40 mt-1">One thing at a time</p>
          </motion.div>
        </header>

        {/* Category Toggle - STATIC */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <CategoryToggle 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory} 
          />
        </motion.div>

        {/* Doing Now Card - STATIC */}
        <DoingNowCard
          task={currentTask}
          category={activeCategory}
          naviPosition={naviPosition}
          onPause={() => currentTask && pauseTask(currentTask.id)}
          onComplete={() => currentTask && completeTask(currentTask.id)}
          onOpenNotes={() => currentTask && handleOpenNotes(currentTask)}
        />

        {/* Up Next Header - STATIC */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1">Up Next</h2>
          <button
            onClick={handleCreateTask}
            className={cn(
              'flex items-center gap-1 py-1 px-2',
              rounded.md,
              'text-cyan-400 text-sm',
              'hover:bg-cyan-500/10 transition-colors'
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ===== SCROLLABLE BOTTOM SECTION ===== */}
      <div
        data-scrollable
        className="flex-1 min-h-0 overflow-y-auto px-5 lg:px-8 pb-6 overscroll-contain touch-pan-y"
      >
        {/* Upcoming Tasks */}
        <div className="space-y-3 mb-6">
          <AnimatePresence mode="popLayout">
            {todoTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/30 text-sm"
              >
                No tasks yet. Add one to get started!
              </motion.div>
            ) : (
              todoTasks.map((task, index) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  index={index}
                  naviPosition={naviPosition}
                  onStart={() => startTask(task.id)}
                  onClick={() => handleTaskClick(task)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Recently Done Section */}
        {doneTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 px-1">
              Recently Done
            </h2>
            <div className="space-y-1">
              {doneTasks.slice(0, 5).map((task) => (
                <DoneTaskItem key={task.id} task={task} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
