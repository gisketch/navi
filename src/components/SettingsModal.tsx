import { useState } from 'react';
import { Settings, X } from 'lucide-react';
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
}: SettingsModalProps) {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempMicMode, setTempMicMode] = useState(micMode);
  const [tempN8nUrl, setTempN8nUrl] = useState(n8nWebhookUrl);

  if (!isOpen) return null;

  const handleSave = () => {
    onApiKeyChange(tempApiKey);
    onMicModeChange(tempMicMode);
    onN8nWebhookUrlChange(tempN8nUrl);
    onClose();
  };

  const handleCancel = () => {
    setTempApiKey(apiKey);
    setTempMicMode(micMode);
    setTempN8nUrl(n8nWebhookUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
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
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
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
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  tempMicMode === 'hold'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Hold to Talk
              </button>
              <button
                onClick={() => setTempMicMode('auto')}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  tempMicMode === 'auto'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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

          {/* n8n Webhook URL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              n8n Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={tempN8nUrl}
              onChange={(e) => setTempN8nUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              For future n8n workflow integration
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
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
