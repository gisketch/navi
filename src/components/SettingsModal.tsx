import { useState } from 'react';
import { Settings, X, LogOut } from 'lucide-react';
import type { MicMode } from '../utils/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  micMode: MicMode;
  onMicModeChange: (mode: MicMode) => void;
  n8nWebhookUrl: string;
  onN8nWebhookUrlChange: (url: string) => void;
  saveNoteWebhook: string;
  onSaveNoteWebhookChange: (url: string) => void;
  onDisconnect: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  micMode,
  onMicModeChange,
  n8nWebhookUrl,
  onN8nWebhookUrlChange,
  saveNoteWebhook,
  onSaveNoteWebhookChange,
  onDisconnect,
}: SettingsModalProps) {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempMicMode, setTempMicMode] = useState(micMode);
  const [tempN8nUrl, setTempN8nUrl] = useState(n8nWebhookUrl);
  // Functions Webhooks
  const [tempSaveNoteWebhook, setTempSaveNoteWebhook] = useState(saveNoteWebhook);

  const [activeTab, setActiveTab] = useState<'general' | 'functions'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onApiKeyChange(tempApiKey);
    onMicModeChange(tempMicMode);
    onN8nWebhookUrlChange(tempN8nUrl);
    onSaveNoteWebhookChange(tempSaveNoteWebhook);
    onClose();
  };

  const handleCancel = () => {
    setTempApiKey(apiKey);
    setTempMicMode(micMode);
    setTempN8nUrl(n8nWebhookUrl);
    setTempSaveNoteWebhook(saveNoteWebhook);
    setActiveTab('general');
    onClose();
  };

  const handleDisconnectClick = () => {
    if (confirm('Are you sure you want to disconnect?')) {
      onDisconnect();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-gray-900/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`text-sm font-medium pb-1 transition-colors ${activeTab === 'general' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={`text-sm font-medium pb-1 transition-colors ${activeTab === 'functions' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
          >
            Functions
          </button>
        </div>

        <div className="space-y-5">
          {activeTab === 'general' ? (
            <>
              {/* API Key */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* Mic Mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Microphone Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTempMicMode('hold')}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${tempMicMode === 'hold'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-black/40 text-gray-300 hover:bg-white/10'
                      }`}
                  >
                    Hold to Talk
                  </button>
                  <button
                    onClick={() => setTempMicMode('auto')}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${tempMicMode === 'auto'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-black/40 text-gray-300 hover:bg-white/10'
                      }`}
                  >
                    Auto (VAD)
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {tempMicMode === 'hold'
                    ? 'Press and hold the mic button to speak'
                    : 'Automatic voice detection - starts/stops recording automatically'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Function Webhooks</h3>
                {/* Save Note Webhook */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Save Note Webhook
                  </label>
                  <input
                    type="url"
                    value={tempSaveNoteWebhook}
                    onChange={(e) => setTempSaveNoteWebhook(e.target.value)}
                    placeholder="https://automate.gisketch.com/webhook/save-note"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
              {/* n8n Webhook URL (Legacy) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  General/Legacy Webhook (Optional)
                </label>
                <input
                  type="url"
                  value={tempN8nUrl}
                  onChange={(e) => setTempN8nUrl(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </>
          )}

        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg bg-black/40 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              Save Changes
            </button>
          </div>

          <button
            onClick={handleDisconnectClick}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Session
          </button>

          <div className="text-center pt-2">
            <span className="text-[10px] text-gray-600 font-mono">
              v{__APP_VERSION__} (Build {__COMMIT_COUNT__})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings button for opening the modal
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
      aria-label="Settings"
    >
      <Settings className="h-5 w-5" />
    </button>
  );
}
