import { useState, useEffect, useCallback } from 'react';
import { useGeminiLive, type ConnectionStatus, type ExternalToolCallHandler } from './useGeminiLive';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import type { ChatMessage, CardData } from '../utils/constants';

// ============================================
// Voice Session Hook
// ============================================
// Combines Gemini Live API, audio capture, and audio playback
// into a single unified interface for voice interactions

// Re-export ConnectionStatus for convenience
export type { ConnectionStatus };

interface UseVoiceSessionOptions {
  apiKey: string;
  systemInstruction: string;
  naviBrainWebhook: string;
  voiceName: string;
  receiveNoteContent: boolean;
  onError?: (error: string) => void;
  onExternalToolCall?: ExternalToolCallHandler;
  financeMode?: boolean;
}

interface UseVoiceSessionReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  
  // Audio state
  isCapturing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  audioInitialized: boolean;
  
  // Chat state
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  liveStatus: string | null;
  isToolActive: boolean;
  activeCards: CardData[];
  
  // Connection actions
  connect: () => Promise<void>;
  disconnect: () => void;
  initializeAudio: () => Promise<void>;
  
  // Audio actions
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  stopPlayback: () => void;
  
  // Chat actions
  sendText: (text: string) => void;
  sendVideo: (base64Image: string, mimeType?: string) => void;
  clearCards: () => void;
  
  // Tool response (for confirming pending finance actions)
  sendToolResponse: (toolCallId: string, toolName: string, result: string) => void;
}

export function useVoiceSession({
  apiKey,
  systemInstruction,
  naviBrainWebhook,
  voiceName,
  receiveNoteContent,
  onError,
  onExternalToolCall,
  financeMode = false,
}: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [error, setError] = useState<string | null>(null);

  // Audio playback hook
  const { isPlaying, queueAudio, stopPlayback } = useAudioPlayback();

  // Gemini Live hook
  const {
    status: connectionStatus,
    messages,
    currentTurn,
    connect: geminiConnect,
    disconnect: geminiDisconnect,
    sendAudio,
    sendVideo,
    sendText,
    liveStatus,
    isToolActive,
    activeCards,
    clearCards,
    sendToolResponse,
  } = useGeminiLive({
    apiKey,
    systemInstruction,
    onAudioResponse: queueAudio,
    onError: (err) => {
      setError(err.message);
      onError?.(err.message);
    },
    naviBrainWebhook,
    voiceName,
    receiveNoteContent,
    onExternalToolCall,
    financeMode,
  });

  // Audio capture hook
  const {
    isCapturing,
    isInitialized: audioInitialized,
    audioLevel,
    initialize: initializeAudio,
    startCapture,
    stopCapture,
  } = useAudioCapture({
    onAudioData: sendAudio,
    onError: (err) => {
      setError(err.message);
      onError?.(err.message);
    },
  });

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Force stop capture if tool becomes active (Navi is thinking)
  useEffect(() => {
    if (isToolActive && isCapturing) {
      stopCapture();
    }
  }, [isToolActive, isCapturing, stopCapture]);

  // Connect with audio initialization
  const connect = useCallback(async () => {
    // Initialize audio first (needs user gesture)
    if (!audioInitialized) {
      await initializeAudio();
    }
    // Connect to Gemini
    await geminiConnect();
  }, [audioInitialized, initializeAudio, geminiConnect]);

  // Disconnect with cleanup
  const disconnect = useCallback(() => {
    geminiDisconnect();
    stopCapture();
    stopPlayback();
  }, [geminiDisconnect, stopCapture, stopPlayback]);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    
    // Audio state
    isCapturing,
    isPlaying,
    audioLevel,
    audioInitialized,
    
    // Chat state
    messages,
    currentTurn,
    liveStatus,
    isToolActive,
    activeCards,
    
    // Connection actions
    connect,
    disconnect,
    initializeAudio,
    
    // Audio actions
    startCapture,
    stopCapture,
    stopPlayback,
    
    // Chat actions
    sendText,
    sendVideo,
    clearCards,
    
    // Tool response
    sendToolResponse,
  };
}
