import { useState, useCallback, useRef } from 'react';
import { Mic, Send, Keyboard, Settings, Radio } from 'lucide-react';
import type { MicMode } from '../utils/constants';
import type { ConnectionStatus } from '../hooks/useGeminiLive';

interface ControlBarProps {
  micMode: MicMode;
  connectionStatus: ConnectionStatus;
  isCapturing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  onStartCapture: () => void | Promise<void>;
  onStopCapture: () => void;
  onSendText: (text: string) => void;
  onStopPlayback: () => void;
  onOpenSettings: () => void;
  onConnect: () => void | Promise<void>;
}

export function ControlBar({
  micMode,
  connectionStatus,
  isCapturing,
  isPlaying,
  audioLevel, // Used for later visualizer expansion
  onStartCapture,
  onStopCapture,
  onSendText,
  onStopPlayback,
  onOpenSettings,
  onConnect,
}: ControlBarProps) {
  const [textInput, setTextInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const isConnected = connectionStatus === 'connected';
  const isHoldingRef = useRef(false);

  // Toggle keyboard mode
  const toggleKeyboard = useCallback(() => {
    setShowKeyboard(prev => !prev);
  }, []);

  const handleSendText = useCallback(() => {
    if (textInput.trim() && isConnected) {
      onSendText(textInput.trim());
      setTextInput('');
    }
  }, [textInput, isConnected, onSendText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  // --- Main Button Logic ---

  const handleMainButtonMouseDown = useCallback(async () => {
    // If not connected, this is just a click handler (handled in onClick)
    if (!isConnected) return;

    if (isPlaying) {
      onStopPlayback();
    }

    if (micMode === 'hold') {
      isHoldingRef.current = true;
      await onStartCapture();
    }
  }, [isConnected, isPlaying, micMode, onStartCapture, onStopPlayback]);

  const handleMainButtonMouseUp = useCallback(() => {
    if (micMode === 'hold' && isHoldingRef.current) {
      isHoldingRef.current = false;
      onStopCapture();
    }
  }, [micMode, onStopCapture]);

  const handleMainButtonClick = useCallback(async () => {
    // 1. Connection Logic
    if (!isConnected) {
      if (connectionStatus !== 'connecting') {
        onConnect();
      }
      return;
    }

    // 2. Mic Logic (when connected)
    if (micMode === 'auto') {
      if (isPlaying && !isCapturing) {
        onStopPlayback();
      }

      if (isCapturing) {
        onStopCapture();
      } else {
        await onStartCapture();
      }
    }
  }, [isConnected, connectionStatus, onConnect, micMode, isPlaying, isCapturing, onStopPlayback, onStopCapture, onStartCapture]);

  return (
    <div className="relative w-full flex flex-col items-center justify-end pb-16 pt-4 px-6 z-50">

      {/* Floating Input Field (appears above buttons) */}
      {showKeyboard && (
        <div className="mb-8 w-full max-w-lg animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="relative flex items-center bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 shadow-2xl ring-1 ring-white/5">
            <input
              autoFocus
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={!isConnected}
              className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 px-4 py-2 outline-none font-medium"
            />
            <button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
              className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:scale-100 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Control Buttons Container (Separated) */}
      <div className="flex items-center justify-center gap-8 glass-button-vars">

        {/* Left: Keyboard Toggle */}
        <button
          onClick={toggleKeyboard}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full border border-[var(--glass-border)] backdrop-blur-sm transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 ${showKeyboard
              ? 'bg-white/20 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]'
              : 'bg-[var(--glass-bg)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
            }`}
          aria-label="Toggle keyboard"
        >
          <Keyboard className="w-6 h-6" />
        </button>

        {/* Center: Main Action Button (Connect / Mic) */}
        <div className="relative group">
          {/* Active Glow */}
          <div className={`absolute inset-0 bg-cyan-500/30 rounded-full blur-2xl transition-all duration-500 ${isCapturing ? 'opacity-100 scale-150' : 'opacity-0'
            }`} />

          <button
            onMouseDown={handleMainButtonMouseDown}
            onMouseUp={handleMainButtonMouseUp}
            onMouseLeave={handleMainButtonMouseUp}
            onTouchStart={(e) => { e.preventDefault(); handleMainButtonMouseDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMainButtonMouseUp(); }}
            onClick={handleMainButtonClick}
            disabled={connectionStatus === 'connecting'}
            className={`relative flex items-center justify-center w-20 h-20 rounded-full border border-[var(--glass-border)] backdrop-blur-sm shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:scale-100 disabled:opacity-70 ${isCapturing
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]'
                : isPlaying
                  ? 'bg-indigo-500/80 text-white animate-pulse border-indigo-400'
                  : 'bg-[var(--glass-bg)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
              }`}
          >
            {/* Icon Logic */}
            {connectionStatus === 'connecting' ? (
              <div className="absolute inset-0 rounded-full border-t-2 border-white/50 animate-spin" />
            ) : !isConnected ? (
              <Radio className="w-8 h-8" /> // Connect Icon
            ) : isCapturing ? (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-white/40 opacity-50" />
                <Mic className="w-8 h-8 relative z-10" />
              </>
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Right: Settings Button */}
        <button
          onClick={onOpenSettings}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full border border-[var(--glass-border)] backdrop-blur-sm bg-[var(--glass-bg)] text-white shadow-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-110 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] active:scale-95"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
}
