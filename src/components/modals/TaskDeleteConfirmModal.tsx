/**
 * Task Delete Confirmation Modal
 * Simple confirmation dialog before deleting a task
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { Task } from '../../utils/taskTypes';

interface TaskDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirm: () => void;
}

export function TaskDeleteConfirmModal({
  isOpen,
  onClose,
  task,
  onConfirm,
}: TaskDeleteConfirmModalProps) {
  if (!task) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] max-w-sm mx-auto"
          >
            <div className={cn(
              'relative overflow-hidden',
              rounded.xl,
              glass.blur['2xl'],
              'bg-white/[0.05] border border-white/10'
            )}>
              {/* Warning glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-3xl pointer-events-none" />

              {/* Content */}
              <div className="relative p-6 text-center">
                {/* Icon */}
                <div className={cn(
                  'w-14 h-14 mx-auto mb-4 flex items-center justify-center',
                  rounded.full,
                  'bg-red-500/20 border border-red-500/30'
                )}>
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-white mb-2">Delete Task?</h2>
                
                {/* Task name */}
                <p className="text-white/60 text-sm mb-1">
                  You're about to delete:
                </p>
                <p className="text-white font-medium mb-4 truncate px-4">
                  "{task.title}"
                </p>

                {/* Warning */}
                <p className="text-white/40 text-xs mb-6">
                  This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className={cn(
                      'flex-1 py-3 px-4',
                      rounded.lg,
                      glass.button,
                      'text-white/70 font-medium',
                      'hover:bg-white/10 transition-all'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={cn(
                      'flex-1 py-3 px-4 flex items-center justify-center gap-2',
                      rounded.lg,
                      'bg-red-500/20 border border-red-500/30',
                      'text-red-400 font-medium',
                      'hover:bg-red-500/30 transition-all',
                      'active:scale-[0.98]'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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
