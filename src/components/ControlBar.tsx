import { useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
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
}

export function ControlBar({
  micMode,
  connectionStatus,
  isCapturing,
  isPlaying,
  audioLevel,
  onStartCapture,
  onStopCapture,
  onSendText,
  onStopPlayback,
}: ControlBarProps) {
  const [textInput, setTextInput] = useState('');
  const isConnected = connectionStatus === 'connected';
  const isHoldingRef = useRef(false);

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

  // Handle mic button interactions
  const handleMicMouseDown = useCallback(async () => {
    if (!isConnected) return;
    
    // Stop AI playback when user starts speaking
    if (isPlaying) {
      onStopPlayback();
    }
    
    if (micMode === 'hold') {
      isHoldingRef.current = true;
      console.log('[ControlBar] Hold started, starting capture');
      await onStartCapture();
    }
  }, [isConnected, isPlaying, micMode, onStartCapture, onStopPlayback]);

  const handleMicMouseUp = useCallback(() => {
    if (micMode === 'hold' && isHoldingRef.current) {
      isHoldingRef.current = false;
      console.log('[ControlBar] Hold ended, stopping capture');
      onStopCapture();
    }
  }, [micMode, onStopCapture]);

  const handleMicClick = useCallback(async () => {
    if (!isConnected) return;
    
    if (micMode === 'auto') {
      // Stop AI playback when user starts speaking
      if (isPlaying && !isCapturing) {
        onStopPlayback();
      }
      
      if (isCapturing) {
        console.log('[ControlBar] Auto mode: stopping capture');
        onStopCapture();
      } else {
        console.log('[ControlBar] Auto mode: starting capture');
        await onStartCapture();
      }
    }
    // For hold mode, click does nothing - only mousedown/mouseup matter
  }, [isConnected, isPlaying, isCapturing, micMode, onStartCapture, onStopCapture, onStopPlayback]);

  const handleMicTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMicMouseDown();
    },
    [handleMicMouseDown]
  );

  const handleMicTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMicMouseUp();
    },
    [handleMicMouseUp]
  );

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      {/* Audio level indicator when capturing */}
      {isCapturing && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="h-2 w-32 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {audioLevel > 0.01 ? 'Audio detected' : 'No audio'}
          </span>
        </div>
      )}
      
      {/* Status indicators */}
      <div className="mb-3 flex items-center justify-center gap-2 text-xs">
        <StatusDot status={connectionStatus} />
        <span className="text-gray-400">
          {connectionStatus === 'connected'
            ? isCapturing
              ? 'Listening...'
              : isPlaying
              ? 'Navi is speaking...'
              : 'Ready'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : connectionStatus === 'error'
            ? 'Connection error'
            : 'Disconnected'}
        </span>
        {isPlaying && (
          <Volume2 className="h-3 w-3 text-green-400 animate-pulse" />
        )}
      </div>

      <div className="flex items-end gap-3">
        {/* Text input - always visible in hold mode, hidden when capturing in auto mode */}
        {(micMode === 'hold' || !isCapturing) && (
          <div className="flex-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Type a message..." : "Connect to start..."}
              disabled={!isConnected}
              className="w-full rounded-full border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        )}

        {/* Send button for text */}
        {textInput.trim() && (
          <button
            onClick={handleSendText}
            disabled={!isConnected}
            className="rounded-full bg-blue-600 p-2.5 text-white hover:bg-blue-500 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        )}

        {/* Mic button */}
        {!textInput.trim() && (
          <button
            onMouseDown={handleMicMouseDown}
            onMouseUp={handleMicMouseUp}
            onMouseLeave={handleMicMouseUp}
            onTouchStart={handleMicTouchStart}
            onTouchEnd={handleMicTouchEnd}
            onClick={handleMicClick}
            disabled={!isConnected}
            className={`rounded-full p-3 transition-all ${
              isCapturing
                ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30'
                : isConnected
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-700 text-gray-400'
            } disabled:opacity-50`}
            aria-label={isCapturing ? 'Stop recording' : 'Start recording'}
          >
            {isCapturing ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>
        )}
      </div>

      {/* Mic mode hint */}
      <p className="mt-2 text-center text-xs text-gray-500">
        {micMode === 'hold'
          ? 'Hold mic button to talk'
          : isCapturing
          ? 'Tap mic to stop listening'
          : 'Tap mic to start listening'}
      </p>
    </div>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colorClass =
    status === 'connected'
      ? 'bg-green-500'
      : status === 'connecting'
      ? 'bg-yellow-500 animate-pulse'
      : status === 'error'
      ? 'bg-red-500'
      : 'bg-gray-500';

  return <div className={`h-2 w-2 rounded-full ${colorClass}`} />;
}
