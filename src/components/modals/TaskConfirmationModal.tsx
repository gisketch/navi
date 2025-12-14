import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  ListTodo,
  Play,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  User,
} from 'lucide-react';
import { cn, glass, rounded } from '../../utils/glass';
import type { PendingTaskAction, TaskToolArgs } from '../../contexts/TaskToolsContext';

// ============================================
// Task Confirmation Modal
// ============================================
// Shows a confirmation dialog for task tool actions
// Displays what will happen and allows confirm/cancel
// Also handles multiple match selection

interface TaskConfirmationModalProps {
  isOpen: boolean;
  pendingAction: PendingTaskAction | null;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectMatch?: (matchId: string) => void;
  isProcessing?: boolean;
}

export function TaskConfirmationModal({
  isOpen,
  pendingAction,
  onConfirm,
  onCancel,
  onSelectMatch,
  isProcessing = false,
}: TaskConfirmationModalProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  if (!pendingAction) return null;

  // Check if this is a multiple match selection scenario
  const hasMultipleMatches = pendingAction.multipleMatches && pendingAction.multipleMatches.matches.length > 1;

  // Handle match selection
  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    onSelectMatch?.(matchId);
  };

  // Get icon and color based on action type
  const getActionStyle = () => {
    switch (pendingAction.toolName) {
      case 'add_task':
        return { icon: ListTodo, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' };
      case 'start_task':
        return { icon: Play, color: 'text-green-400', bgColor: 'bg-green-500/20' };
      case 'complete_task':
        return { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
      default:
        return { icon: ListTodo, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    }
  };

  const { icon: Icon, color, bgColor } = getActionStyle();

  // Get action details for display
  const getActionDetails = () => {
    switch (pendingAction.toolName) {
      case 'add_task': {
        const args = pendingAction.args as TaskToolArgs['add_task'];
        return {
          title: 'Add Task',
          details: [
            { label: 'Title', value: args.title },
            { label: 'Category', value: args.category, icon: args.category === 'work' ? Briefcase : User },
            ...(args.deadline ? [{ label: 'Deadline', value: new Date(args.deadline).toLocaleDateString() }] : []),
          ],
        };
      }
      case 'start_task': {
        const args = pendingAction.args as TaskToolArgs['start_task'];
        const task = pendingAction.resolvedData?.task;
        return {
          title: 'Start Task',
          details: [
            { label: 'Task', value: task?.title || args.task_name },
            ...(task ? [{ label: 'Category', value: task.category, icon: task.category === 'work' ? Briefcase : User }] : []),
          ],
        };
      }
      case 'complete_task': {
        const args = pendingAction.args as TaskToolArgs['complete_task'];
        const task = pendingAction.resolvedData?.task;
        return {
          title: 'Complete Task',
          details: [
            { label: 'Task', value: task?.title || args.task_name },
            ...(task ? [{ label: 'Category', value: task.category, icon: task.category === 'work' ? Briefcase : User }] : []),
          ],
        };
      }
      default:
        return { title: 'Task Action', details: [] };
    }
  };

  const actionDetails = getActionDetails();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm"
          >
            <div className={cn(
              glass.modal,
              rounded.xl,
              'border border-white/10 overflow-hidden'
            )}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 flex items-center justify-center',
                    rounded.lg,
                    bgColor
                  )}>
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{actionDetails.title}</h3>
                    <p className="text-xs text-white/50">Confirm this action</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center',
                    rounded.full,
                    'bg-white/5 hover:bg-white/10 transition-colors'
                  )}
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Multiple matches selection */}
                {hasMultipleMatches && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/70 mb-2">Multiple tasks found. Select one:</p>
                    {pendingAction.multipleMatches!.matches.map((match) => (
                      <button
                        key={match.id}
                        onClick={() => handleSelectMatch(match.id)}
                        className={cn(
                          'w-full p-3 text-left flex items-center gap-3',
                          rounded.lg,
                          'border transition-all',
                          selectedMatchId === match.id
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        )}
                      >
                        {match.category === 'work' ? (
                          <Briefcase className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <User className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="flex-1 text-white/90">{match.title}</span>
                        {selectedMatchId === match.id && (
                          <Check className="w-4 h-4 text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Action details */}
                {!hasMultipleMatches && (
                  <div className="space-y-3">
                    {actionDetails.details.map((detail, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-white/50">{detail.label}</span>
                        <div className="flex items-center gap-2">
                          {'icon' in detail && detail.icon && (
                            <detail.icon className={cn(
                              'w-4 h-4',
                              detail.value === 'work' ? 'text-cyan-400' : 'text-purple-400'
                            )} />
                          )}
                          <span className="text-sm text-white font-medium">{detail.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description preview */}
                <div className={cn(
                  'p-3',
                  rounded.lg,
                  'bg-white/5 border border-white/10'
                )}>
                  <p className="text-sm text-white/70">{pendingAction.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-4 border-t border-white/10">
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className={cn(
                    'flex-1 py-2.5 px-4',
                    rounded.lg,
                    'bg-white/5 hover:bg-white/10',
                    'text-white/70 font-medium text-sm',
                    'transition-colors',
                    'disabled:opacity-50'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isProcessing || (hasMultipleMatches && !selectedMatchId)}
                  className={cn(
                    'flex-1 py-2.5 px-4 flex items-center justify-center gap-2',
                    rounded.lg,
                    'bg-cyan-500/20 hover:bg-cyan-500/30',
                    'text-cyan-400 font-medium text-sm',
                    'border border-cyan-500/30',
                    'transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
