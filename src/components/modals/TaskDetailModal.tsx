/**
 * Task Detail Modal - View task details and take action
 * 
 * Features:
 * - View task title, description, deadline
 * - "Start Action" button (the ritual!)
 * - "Open in Obsidian" deep link
 * - Edit/Delete options
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play,
  Pause,
  CheckCircle2,
  ExternalLink,
  Calendar,
  AlertCircle,
  Trash2,
  Pencil,
  Clock,
} from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { Task } from '../../utils/taskTypes';
import { isOverdue, getObsidianUri, formatElapsedTime } from '../../utils/taskTypes';
import { useState, useEffect } from 'react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onStart,
  onPause,
  onComplete,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Reset delete confirm when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  // Update elapsed time for in_progress tasks
  useEffect(() => {
    if (!task?.started_at || task.status !== 'in_progress') {
      setElapsed(0);
      return;
    }

    const startTime = new Date(task.started_at).getTime();
    setElapsed(Math.floor((Date.now() - startTime) / (1000 * 60)));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / (1000 * 60)));
    }, 60000);

    return () => clearInterval(interval);
  }, [task?.started_at, task?.status]);

  if (!task) return null;

  const accentColor = task.category === 'work' 
    ? { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.5)' }
    : { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', glow: 'rgba(168, 85, 247, 0.5)' };

  const overdue = isOverdue(task);
  const isInProgress = task.status === 'in_progress';

  const handleOpenNotes = () => {
    const uri = getObsidianUri(task);
    window.open(uri, '_blank');
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div
              className={cn(
                'relative overflow-hidden',
                rounded.xl,
                glass.modal,
                'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
              )}
            >
              {/* Top accent gradient */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: `linear-gradient(90deg, transparent, ${accentColor.glow}, transparent)`,
                }}
              />

              {/* Glow effect for in_progress */}
              {isInProgress && (
                <div 
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 blur-3xl pointer-events-none',
                    task.category === 'work' ? 'bg-cyan-400/20' : 'bg-purple-400/20'
                  )} 
                />
              )}

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-xs font-medium uppercase tracking-wider px-2 py-0.5',
                        rounded.full,
                        isInProgress 
                          ? cn(accentColor.text, 'bg-white/10') 
                          : 'text-white/50 bg-white/5'
                      )}>
                        {task.status === 'in_progress' ? 'In Progress' : 
                         task.status === 'done' ? 'Completed' :
                         task.status === 'archived' ? 'Archived' : 'To Do'}
                      </span>
                      {isInProgress && (
                        <div className="flex items-center gap-1 text-white/50">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-mono">{formatElapsedTime(elapsed)}</span>
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-white">{task.title}</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className={cn(
                      'p-2 -m-2 shrink-0',
                      rounded.md,
                      'text-white/50 hover:text-white hover:bg-white/10',
                      'transition-colors'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content/Description */}
                {task.content && (
                  <p className="text-base text-white/60 mb-4 leading-relaxed">
                    {task.content}
                  </p>
                )}

                {/* Deadline */}
                {task.deadline && (
                  <div className={cn(
                    'flex items-center gap-2 mb-4 text-sm',
                    overdue ? 'text-red-400' : 'text-white/50'
                  )}>
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                    {overdue && (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">(overdue)</span>
                      </>
                    )}
                  </div>
                )}

                {/* File path info */}
                <div className="text-xs text-white/30 mb-6 font-mono">
                  {task.obsidian_path}{task.category === 'work' ? 'Work' : 'Personal'}/{task.slug}.md
                </div>

                {/* Primary Actions */}
                <div className="flex gap-3 mb-4">
                  {task.status === 'todo' && (
                    <button
                      onClick={() => {
                        onStart();
                        onClose();
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 px-4',
                        rounded.lg,
                        task.category === 'work' 
                          ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                          : 'bg-purple-500/20 border border-purple-500/30 text-purple-400',
                        'font-medium',
                        'hover:bg-opacity-30 transition-all duration-200',
                        'active:scale-[0.98]'
                      )}
                    >
                      <Play className="w-5 h-5" />
                      <span>Start Action</span>
                    </button>
                  )}

                  {task.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => {
                          onComplete();
                          onClose();
                        }}
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
                        onClick={() => {
                          onPause();
                          onClose();
                        }}
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
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleOpenNotes}
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

                {/* Secondary Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={onEdit}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3',
                      rounded.md,
                      'text-white/50 text-sm',
                      'hover:text-white/70 hover:bg-white/5',
                      'transition-colors'
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3',
                      rounded.md,
                      'text-sm transition-colors',
                      showDeleteConfirm 
                        ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' 
                        : 'text-white/50 hover:text-red-400 hover:bg-white/5'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{showDeleteConfirm ? 'Confirm Delete' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
