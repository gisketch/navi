import React, { useState, useEffect } from 'react';
import { X, Mic, Key, Save, Trash2, Webhook, Info, Volume2 } from 'lucide-react';
import { NaviSettings, VOICE_OPTIONS } from '../utils/constants';

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
}

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
  onVoiceNameChange
}) => {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempSystemInstruction, setTempSystemInstruction] = useState(systemInstruction);
  const [tempNaviBrainWebhook, setTempNaviBrainWebhook] = useState(naviBrainWebhook);
  const [tempVoiceName, setTempVoiceName] = useState(voiceName);
  const [activeTab, setActiveTab] = useState<'general' | 'functions'>('general');

  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey);
      setTempSystemInstruction(systemInstruction);
      setTempNaviBrainWebhook(naviBrainWebhook);
      setTempVoiceName(voiceName);
    }
  }, [isOpen, apiKey, systemInstruction, naviBrainWebhook, voiceName]);

  const handleSave = () => {
    onApiKeyChange(tempApiKey);
    onSystemInstructionChange(tempSystemInstruction);
    onNaviBrainWebhookChange(tempNaviBrainWebhook);
    onVoiceNameChange(tempVoiceName);
    onSave();
    onClose();
  };

  const handleCancel = () => {
    setTempApiKey(apiKey);
    setTempSystemInstruction(systemInstruction);
    setTempNaviBrainWebhook(naviBrainWebhook);
    setTempVoiceName(voiceName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            Settings
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'general' ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
          >
            General
            {activeTab === 'general' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'functions' ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
          >
            Functions
            {activeTab === 'functions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

          {activeTab === 'general' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Key size={12} /> Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Paste your API key here..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm font-mono"
                  />
                  <p className="text-xs text-white/30">
                    Your key is stored locally in your browser.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Mic size={12} /> Microphone Mode
                    </label>
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
                      {/* Custom small toggle for Mic Mode */}
                      <select
                        value={micMode}
                        onChange={(e) => onMicModeChange(e.target.value as any)}
                        className="w-full bg-transparent text-white text-sm focus:outline-none px-2 py-1 appearance-none cursor-pointer"
                      >
                        <option value="manual" className="bg-[#1e1e1e]">Push-to-Talk</option>
                        <option value="auto" className="bg-[#1e1e1e]">Automated (VAD)</option>
                      </select>
                      {/* Reverting to button style for consistency or keep select? The previous design had buttons. I'll stick to the previous button design but maybe make it vertically stacked or side-by-side with Voice? */}
                    </div>
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => onMicModeChange('manual')}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${micMode === 'manual'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-white/40 hover:text-white/60'
                          }`}
                      >
                        Push-to-Talk
                      </button>
                      <button
                        onClick={() => onMicModeChange('auto')}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${micMode === 'auto'
                            ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                            : 'text-white/40 hover:text-white/60'
                          }`}
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Volume2 size={12} /> Voice
                    </label>
                    <div className="relative">
                      <select
                        value={tempVoiceName}
                        onChange={(e) => setTempVoiceName(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm appearance-none cursor-pointer"
                      >
                        {VOICE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-[#1e1e1e] text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Info size={12} /> System Instructions
                  </label>
                  <textarea
                    value={tempSystemInstruction}
                    onChange={(e) => setTempSystemInstruction(e.target.value)}
                    placeholder="Give Navi a personality or specific rules..."
                    className="w-full h-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
                  />
                  <p className="text-xs text-white/30">
                    Define how Navi should behave.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'functions' && (
            <div className="space-y-6">
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <Webhook size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white">Navi Brain Webhook</h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Connects Navi to your backend agent (n8n). All "Brain" requests (Search/Save/Read) are sent here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={tempNaviBrainWebhook}
                  onChange={(e) => setTempNaviBrainWebhook(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-mono"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/20 font-mono">v{__APP_VERSION__}</span>
            <span className="text-[10px] text-white/20 font-mono">b{__COMMIT_COUNT__}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-xl text-xs font-medium bg-white text-black hover:bg-gray-200 transition-colors shadow-lg shadow-white/5 flex items-center gap-2"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
