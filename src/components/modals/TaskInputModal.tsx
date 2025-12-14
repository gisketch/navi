/**
 * Task Input Modal - Create new tasks
 * 
 * Features:
 * - Title input with auto-generated slug
 * - Category toggle (Work/Personal)
 * - Optional deadline picker
 * - Optional description/content
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check,
  AlertCircle,
  Briefcase,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { cn, rounded, glass } from '../../utils/glass';
import type { Task, TaskCategory } from '../../utils/taskTypes';
import { generateSlug } from '../../utils/taskTypes';

interface TaskInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void | Promise<void>;
  initialCategory?: TaskCategory;
  editTask?: Task | null; // For edit mode
}

export interface TaskFormData {
  title: string;
  slug: string;
  category: TaskCategory;
  content?: string;
  deadline?: string;
  obsidian_path: string;
  status: 'todo';
  sort_order: number;
}

export function TaskInputModal({
  isOpen,
  onClose,
  onSubmit,
  initialCategory = 'work',
  editTask,
}: TaskInputModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState<TaskCategory>(initialCategory);
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setTitle(editTask.title);
        setSlug(editTask.slug);
        setSlugManuallyEdited(true);
        setCategory(editTask.category);
        setContent(editTask.content || '');
        setDeadline(editTask.deadline || '');
        setShowAdvanced(!!editTask.content || !!editTask.deadline);
      } else {
        setTitle('');
        setSlug('');
        setSlugManuallyEdited(false);
        setCategory(initialCategory);
        setContent('');
        setDeadline('');
        setShowAdvanced(false);
      }
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen, editTask, initialCategory]);

  // Auto-generate slug from title
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    setError(null);
    
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }, [slugManuallyEdited]);

  // Handle slug edit
  const handleSlugChange = useCallback((value: string) => {
    setSlug(generateSlug(value));
    setSlugManuallyEdited(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    if (!slug.trim()) {
      setError('Please enter a valid slug');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        category,
        content: content.trim() || undefined,
        deadline: deadline || undefined,
        obsidian_path: 'Inbox/',
        status: 'todo',
        sort_order: Date.now(), // New tasks get high sort order (end of list)
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, slug, category, content, deadline, onSubmit, onClose]);

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim() && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  }, [title, isSubmitting, handleSubmit]);

  const accentColor = category === 'work' 
    ? { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.5)' }
    : { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', glow: 'rgba(168, 85, 247, 0.5)' };

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
            className="fixed inset-x-4 bottom-24 z-50 max-w-md mx-auto"
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

              {/* Success overlay */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm z-20 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center"
                    >
                      <Check className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    {editTask ? 'Edit Task' : 'New Task'}
                  </h2>
                  <button
                    onClick={onClose}
                    className={cn(
                      'p-2 -m-2',
                      rounded.md,
                      'text-white/50 hover:text-white hover:bg-white/10',
                      'transition-colors'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category Toggle */}
                <div className={cn(
                  'flex p-1 gap-1 mb-4',
                  rounded.lg,
                  'bg-white/5 border border-white/10',
                )}>
                  <button
                    onClick={() => setCategory('work')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 transition-all duration-200',
                      rounded.md,
                      category === 'work' 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'text-white/50 hover:text-white/70'
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm">Work</span>
                  </button>
                  <button
                    onClick={() => setCategory('personal')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 transition-all duration-200',
                      rounded.md,
                      category === 'personal' 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : 'text-white/50 hover:text-white/70'
                    )}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Personal</span>
                  </button>
                </div>

                {/* Title Input */}
                <div className="mb-4">
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
                    What needs to be done?
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Fix the login bug"
                    className={cn(
                      'w-full py-3 px-4',
                      rounded.lg,
                      'bg-white/5 border border-white/10',
                      'text-white placeholder:text-white/30',
                      'focus:outline-none focus:border-white/20 focus:bg-white/[0.07]',
                      'transition-all duration-200'
                    )}
                  />
                </div>

                {/* Slug (auto-generated) */}
                <div className="mb-4">
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    File name (auto-generated)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="task-slug"
                    className={cn(
                      'w-full py-2 px-3',
                      rounded.md,
                      'bg-white/[0.03] border border-white/5',
                      'text-white/60 text-sm font-mono placeholder:text-white/20',
                      'focus:outline-none focus:border-white/10',
                      'transition-all duration-200'
                    )}
                  />
                </div>

                {/* Advanced Options Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    'flex items-center gap-2 text-sm mb-4',
                    accentColor.text,
                    'hover:opacity-80 transition-opacity'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>{showAdvanced ? 'Hide' : 'Show'} more options</span>
                </button>

                {/* Advanced Options */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Deadline */}
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-2">
                          <Calendar className="w-3 h-3" />
                          <span>Plan to finish by</span>
                        </label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className={cn(
                            'w-full py-2 px-3',
                            rounded.md,
                            'bg-white/5 border border-white/10',
                            'text-white placeholder:text-white/30',
                            'focus:outline-none focus:border-white/20',
                            'transition-all duration-200',
                            // Style the calendar icon
                            '[&::-webkit-calendar-picker-indicator]:invert',
                            '[&::-webkit-calendar-picker-indicator]:opacity-50',
                            '[&::-webkit-calendar-picker-indicator]:hover:opacity-80'
                          )}
                        />
                      </div>

                      {/* Description/Content */}
                      <div className="mb-4">
                        <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Any context or notes..."
                          rows={3}
                          className={cn(
                            'w-full py-2 px-3 resize-none',
                            rounded.md,
                            'bg-white/5 border border-white/10',
                            'text-white placeholder:text-white/30',
                            'focus:outline-none focus:border-white/20',
                            'transition-all duration-200'
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 text-red-400 text-sm mb-4"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  className={cn(
                    'w-full py-3 px-4',
                    rounded.lg,
                    'font-medium transition-all duration-200',
                    title.trim() && !isSubmitting
                      ? cn(
                          category === 'work' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                                              : 'bg-purple-500/20 border-purple-500/30 text-purple-400',
                          'border hover:bg-opacity-30 active:scale-[0.98]'
                        )
                      : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? 'Creating...' : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
