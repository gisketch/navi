import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, Clock, Code, ArrowRight } from 'lucide-react';
import { cn, glass, rounded } from '../../utils/glass';
import type { FunctionCallLog } from '../../contexts/FunctionCallLogContext';

interface FunctionCallDetailModalProps {
  isOpen: boolean;
  log: FunctionCallLog | null;
  onClose: () => void;
}

export function FunctionCallDetailModal({ isOpen, log, onClose }: FunctionCallDetailModalProps) {
  if (!log) return null;

  const date = new Date(log.timestamp);
  const formattedDate = date.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Format JSON for display
  const formatJson = (data: unknown): string => {
    try {
      if (typeof data === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(data);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return data;
        }
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
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
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]',
              'w-[95vw] max-w-[500px] max-h-[85vh]',
              glass.modal,
              rounded.xl,
              'border border-white/10',
              'overflow-hidden flex flex-col'
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  log.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                )}>
                  {log.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{log.functionName}</h2>
                  <p className="text-white/40 text-sm flex items-center gap-1">
                    <Clock size={12} />
                    {formattedDate} at {formattedTime}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-full',
                  'text-white/50 hover:text-white/80',
                  'hover:bg-white/10',
                  'transition-colors'
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Duration */}
              {log.durationMs !== undefined && (
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Clock size={14} />
                  <span>Completed in {log.durationMs}ms</span>
                </div>
              )}

              {/* Error message */}
              {!log.success && log.errorMessage && (
                <div className={cn(
                  'p-3 rounded-lg',
                  'bg-red-500/10 border border-red-500/20'
                )}>
                  <p className="text-red-400 text-sm font-medium mb-1">Error</p>
                  <p className="text-red-300/80 text-sm">{log.errorMessage}</p>
                </div>
              )}

              {/* Input */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code size={14} className="text-cyan-400" />
                  <span className="text-white/70 text-sm font-medium">Input</span>
                  <ArrowRight size={12} className="text-white/30" />
                </div>
                <pre className={cn(
                  'p-3 rounded-lg text-xs overflow-x-auto',
                  'bg-black/30 border border-white/5',
                  'text-cyan-300/80 font-mono'
                )}>
                  {formatJson(log.input)}
                </pre>
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code size={14} className={log.success ? 'text-emerald-400' : 'text-red-400'} />
                  <span className="text-white/70 text-sm font-medium">Output</span>
                  <ArrowRight size={12} className="text-white/30" />
                </div>
                <pre className={cn(
                  'p-3 rounded-lg text-xs overflow-x-auto',
                  'bg-black/30 border border-white/5',
                  log.success ? 'text-emerald-300/80' : 'text-red-300/80',
                  'font-mono'
                )}>
                  {formatJson(log.output)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 shrink-0">
              <button
                onClick={onClose}
                className={cn(
                  'w-full py-3 px-4 rounded-xl',
                  'bg-white/5 hover:bg-white/10',
                  'border border-white/10',
                  'text-white/70 hover:text-white',
                  'font-medium text-sm',
                  'transition-all'
                )}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
