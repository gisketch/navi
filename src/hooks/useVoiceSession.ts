import { useState, useEffect, useCallback, useRef } from 'react';
import { useGeminiLive, type ConnectionStatus, type ExternalToolCallHandler } from './useGeminiLive';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import type { ChatMessage, CardData } from '../utils/constants';

// ============================================
// Voice Session Hook
// ============================================
// Combines Gemini Live API, audio capture, and audio playback
// into a single unified interface for voice interactions
//
// Push-to-Talk Mode (default for voice overlays):
// 1. User presses mic → starts recording (audio buffered, NOT sent)
// 2. User presses stop → stops recording, sends buffered audio to Navi
// 3. Navi responds → mic is disabled until response complete
// 4. User can interrupt by pressing mic again

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
  taskMode?: boolean;
  pushToTalk?: boolean; // If true, use push-to-talk flow (default: true for voice overlays)
}

interface UseVoiceSessionReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  
  // Audio state
  isCapturing: boolean; // True when actively recording audio
  isRecording: boolean; // Alias for isCapturing in PTT mode
  isPlaying: boolean;
  audioLevel: number;
  audioInitialized: boolean;
  isNaviResponding: boolean; // True when Navi is generating a response
  
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
  
  // Audio actions - PTT style
  toggleRecording: () => Promise<void>; // Main action: start/stop recording
  startCapture: () => Promise<void>; // Legacy: start recording
  stopCapture: () => void; // Legacy: stop recording (in PTT, also sends audio)
  stopPlayback: () => void;
  interruptNavi: () => Promise<void>; // Stop Navi and start new recording
  
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
  taskMode = false,
  pushToTalk = true, // Default to PTT for voice overlays
}: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [error, setError] = useState<string | null>(null);
  const [isNaviResponding, setIsNaviResponding] = useState(false);
  
  // Audio buffer for push-to-talk mode
  const audioBufferRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const isCapturingRef = useRef(false); // Ref to avoid closure issues in toggleRecording

  // Audio playback hook
  const { isPlaying, queueAudio, stopPlayback: rawStopPlayback } = useAudioPlayback();

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
    taskMode,
  });

  // Handle audio data - buffer in PTT mode, send immediately otherwise
  const handleAudioData = useCallback((base64Audio: string) => {
    if (pushToTalk) {
      // Buffer audio for later sending
      audioBufferRef.current.push(base64Audio);
    } else {
      // Send immediately (legacy behavior)
      sendAudio(base64Audio);
    }
  }, [pushToTalk, sendAudio]);

  // Audio capture hook - now uses our handler
  const {
    isCapturing,
    isInitialized: audioInitialized,
    audioLevel,
    initialize: initializeAudio,
    startCapture: rawStartCapture,
    stopCapture: rawStopCapture,
  } = useAudioCapture({
    onAudioData: handleAudioData,
    onError: (err) => {
      setError(err.message);
      onError?.(err.message);
    },
  });

  // Track when Navi is responding (has audio playing or currentTurn is assistant)
  useEffect(() => {
    const responding = isPlaying || (currentTurn?.role === 'assistant') || isToolActive;
    setIsNaviResponding(responding);
  }, [isPlaying, currentTurn, isToolActive]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // PTT: Start recording (buffer audio, don't send yet)
  const startCapture = useCallback(async () => {
    if (isCapturingRef.current) {
      console.log('[VoiceSession] Already capturing, ignoring start');
      return;
    }
    if (pushToTalk) {
      // Clear buffer and start recording
      audioBufferRef.current = [];
      isRecordingRef.current = true;
      console.log('[VoiceSession] PTT: Starting recording...');
    }
    isCapturingRef.current = true;
    await rawStartCapture();
  }, [pushToTalk, rawStartCapture]);

  // PTT: Stop recording and send buffered audio
  const stopCapture = useCallback(() => {
    if (!isCapturingRef.current) {
      console.log('[VoiceSession] Not capturing, ignoring stop');
      return;
    }
    isCapturingRef.current = false;
    rawStopCapture();
    
    if (pushToTalk && isRecordingRef.current) {
      isRecordingRef.current = false;
      
      // Send all buffered audio to Gemini
      const buffer = audioBufferRef.current;
      console.log(`[VoiceSession] PTT: Sending ${buffer.length} audio chunks to Navi...`);
      
      if (buffer.length > 0) {
        // Send all chunks
        for (const chunk of buffer) {
          sendAudio(chunk);
        }
        // Clear buffer
        audioBufferRef.current = [];
      }
    }
  }, [pushToTalk, rawStopCapture, sendAudio]);

  // Stop playback wrapper
  const stopPlayback = useCallback(() => {
    rawStopPlayback();
  }, [rawStopPlayback]);

  // Toggle recording (main PTT action)
  const toggleRecording = useCallback(async () => {
    console.log('[VoiceSession] toggleRecording called, isCapturingRef:', isCapturingRef.current);
    if (isCapturingRef.current) {
      // Stop recording and send to Navi
      stopCapture();
    } else {
      // If Navi is responding, stop her first
      if (isNaviResponding) {
        stopPlayback();
      }
      // Start recording
      await startCapture();
    }
  }, [isNaviResponding, stopCapture, stopPlayback, startCapture]);

  // Interrupt Navi and start new recording
  const interruptNavi = useCallback(async () => {
    stopPlayback();
    await startCapture();
  }, [stopPlayback, startCapture]);

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
    rawStopCapture();
    rawStopPlayback();
    audioBufferRef.current = [];
    isRecordingRef.current = false;
  }, [geminiDisconnect, rawStopCapture, rawStopPlayback]);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    
    // Audio state
    isCapturing,
    isRecording: isCapturing, // Alias for PTT clarity
    isPlaying,
    audioLevel,
    audioInitialized,
    isNaviResponding,
    
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
    toggleRecording,
    startCapture,
    stopCapture,
    stopPlayback,
    interruptNavi,
    
    // Chat actions
    sendText,
    sendVideo,
    clearCards,
    
    // Tool response
    sendToolResponse,
  };
}
