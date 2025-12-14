import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Webhook, Volume2, Cpu, FileText } from 'lucide-react';
import { VOICE_OPTIONS, GEMINI_MODEL } from '../../utils/constants';
import { cn, rounded } from '../../utils/glass';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
  naviBrainWebhook: string;
  onNaviBrainWebhookChange: (url: string) => void;
  onSave: () => void;
  micMode: 'manual' | 'auto';
  onMicModeChange: (mode: 'manual' | 'auto') => void;
  voiceName: string;
  onVoiceNameChange: (voice: string) => void;
  receiveNoteContent: boolean;
  onReceiveNoteContentChange: (enabled: boolean) => void;
}

type TabId = 'api' | 'voice' | 'webhooks' | 'about';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'api', label: 'API', icon: <Key size={14} /> },
  { id: 'voice', label: 'Voice', icon: <Volume2 size={14} /> },
  { id: 'webhooks', label: 'Hooks', icon: <Webhook size={14} /> },
  { id: 'about', label: 'About', icon: <Cpu size={14} /> },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  systemInstruction,
  onSystemInstructionChange,
  naviBrainWebhook,
  onNaviBrainWebhookChange,
  onSave,
  micMode,
  onMicModeChange,
  voiceName,
  onVoiceNameChange,
  receiveNoteContent,
  onReceiveNoteContentChange
}) => {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempSystemInstruction, setTempSystemInstruction] = useState(systemInstruction);
  const [tempNaviBrainWebhook, setTempNaviBrainWebhook] = useState(naviBrainWebhook);
  const [tempVoiceName, setTempVoiceName] = useState(voiceName);
  const [tempReceiveNoteContent, setTempReceiveNoteContent] = useState(receiveNoteContent);
  const [activeTab, setActiveTab] = useState<TabId>('api');

  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey);
      setTempSystemInstruction(systemInstruction);
      setTempNaviBrainWebhook(naviBrainWebhook);
      setTempVoiceName(voiceName);
      setTempReceiveNoteContent(receiveNoteContent);
    }
  }, [isOpen, apiKey, systemInstruction, naviBrainWebhook, voiceName, receiveNoteContent]);

  const handleSave = () => {
    onApiKeyChange(tempApiKey);
    onSystemInstructionChange(tempSystemInstruction);
    onNaviBrainWebhookChange(tempNaviBrainWebhook);
    onVoiceNameChange(tempVoiceName);
    onReceiveNoteContentChange(tempReceiveNoteContent);
    onSave();
    onClose();
  };

  const handleCancel = () => {
    setTempApiKey(apiKey);
    setTempSystemInstruction(systemInstruction);
    setTempNaviBrainWebhook(naviBrainWebhook);
    setTempVoiceName(voiceName);
    setTempReceiveNoteContent(receiveNoteContent);
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
            onClick={handleCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[15%] z-[1001] mx-auto max-w-md"
          >
            <div className={cn(
              'backdrop-blur-2xl bg-white/[0.03] border border-white/10',
              rounded.xl,
              'overflow-hidden shadow-2xl'
            )}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h2 className="text-base font-medium text-white">Settings</h2>
                <button
                  onClick={handleCancel}
                  className={cn(
                    'p-1.5 hover:bg-white/10 transition-colors text-white/60 hover:text-white',
                    rounded.full
                  )}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5 px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors relative',
                      activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="settings-tab-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-[45vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'api' && (
                    <motion.div
                      key="api"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {/* API Key */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          Gemini API Key
                        </label>
                        <input
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="Paste your API key..."
                          className={cn(
                            'w-full px-3 py-2 text-sm text-white placeholder-white/20',
                            'bg-black/30 border border-white/10',
                            rounded.lg,
                            'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
                            'font-mono transition-all'
                          )}
                        />
                        <p className="text-[10px] text-white/30">Stored locally in your browser</p>
                      </div>

                      {/* Model Info */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          Model
                        </label>
                        <div className={cn(
                          'px-3 py-2 text-xs text-white/50 font-mono flex items-center justify-between',
                          'bg-black/20 border border-white/5',
                          rounded.lg
                        )}>
                          <span className="truncate">{GEMINI_MODEL.replace('models/', '')}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0 ml-2">
                            Active
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'voice' && (
                    <motion.div
                      key="voice"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {/* Voice Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          Voice
                        </label>
                        <div className="relative">
                          <select
                            value={tempVoiceName}
                            onChange={(e) => setTempVoiceName(e.target.value)}
                            className={cn(
                              'w-full px-3 py-2 text-sm text-white',
                              'bg-black/30 border border-white/10',
                              rounded.lg,
                              'focus:outline-none focus:border-cyan-500/50',
                              'appearance-none cursor-pointer'
                            )}
                          >
                            {VOICE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#1a1a1a]">
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-white/40">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Mic Mode */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          Microphone Mode
                        </label>
                        <div className={cn('flex p-0.5 gap-0.5', 'bg-black/30 border border-white/10', rounded.lg)}>
                          <button
                            onClick={() => onMicModeChange('manual')}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-medium transition-all',
                              rounded.md,
                              micMode === 'manual'
                                ? 'bg-white/10 text-white'
                                : 'text-white/40 hover:text-white/60'
                            )}
                          >
                            Push-to-Talk
                          </button>
                          <button
                            onClick={() => onMicModeChange('auto')}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-medium transition-all',
                              rounded.md,
                              micMode === 'auto'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'text-white/40 hover:text-white/60'
                            )}
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'webhooks' && (
                    <motion.div
                      key="webhooks"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {/* Brain Webhook */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                          <Webhook size={10} /> Navi Brain (n8n)
                        </label>
                        <input
                          type="text"
                          value={tempNaviBrainWebhook}
                          onChange={(e) => setTempNaviBrainWebhook(e.target.value)}
                          placeholder="https://your-n8n.com/webhook/..."
                          className={cn(
                            'w-full px-3 py-2 text-sm text-white placeholder-white/20',
                            'bg-black/30 border border-white/10',
                            rounded.lg,
                            'focus:outline-none focus:border-purple-500/50',
                            'font-mono transition-all'
                          )}
                        />
                        <p className="text-[10px] text-white/30">Search, save, read notes</p>
                      </div>

                      {/* Note Content Toggle */}
                      <div className={cn(
                        'flex items-center justify-between p-3',
                        'bg-black/20 border border-white/5',
                        rounded.lg
                      )}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                            <FileText size={12} className="text-blue-400" />
                            Use Notes for Context
                          </div>
                          <p className="text-[10px] text-white/40">Remember note contents</p>
                        </div>
                        <button
                          onClick={() => setTempReceiveNoteContent(!tempReceiveNoteContent)}
                          className={cn(
                            'relative w-10 h-5 transition-colors',
                            rounded.full,
                            tempReceiveNoteContent ? 'bg-cyan-500' : 'bg-white/20'
                          )}
                        >
                          <motion.div
                            animate={{ x: tempReceiveNoteContent ? 20 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={cn('absolute top-0.5 w-4 h-4 bg-white', rounded.full)}
                          />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'about' && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Version Info */}
                      <div className={cn(
                        'p-3 space-y-2',
                        'bg-black/20 border border-white/5',
                        rounded.lg
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">Version</span>
                          <span className="text-xs font-mono text-white">v{__APP_VERSION__}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">Build</span>
                          <span className="text-xs font-mono text-white/70">{__COMMIT_COUNT__}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">Model</span>
                          <span className="text-[10px] font-mono text-cyan-400 truncate ml-2">
                            {GEMINI_MODEL.replace('models/', '')}
                          </span>
                        </div>
                      </div>

                      {/* System Instruction Preview */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          System Prompt (Read-only)
                        </label>
                        <div className={cn(
                          'h-24 overflow-y-auto px-3 py-2 text-[10px] text-white/40 font-mono',
                          'bg-black/20 border border-white/5',
                          rounded.lg
                        )}>
                          {tempSystemInstruction || 'Loading...'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <button
                  onClick={handleCancel}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors',
                    rounded.lg
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className={cn(
                    'px-4 py-1.5 text-xs font-medium flex items-center gap-1.5',
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                    'hover:bg-cyan-500/30 transition-colors',
                    rounded.lg
                  )}
                >
                  <Save size={12} />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
