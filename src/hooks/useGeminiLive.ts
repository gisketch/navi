import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { GEMINI_MODEL, AUDIO_CONFIG } from '../utils/constants';

const INPUT_SAMPLE_RATE = AUDIO_CONFIG.INPUT_SAMPLE_RATE;
import type { ChatMessage } from '../utils/constants';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseGeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  onAudioResponse?: (audioData: string) => void;
  onError?: (error: Error) => void;
}

interface UseGeminiLiveReturn {
  status: ConnectionStatus;
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (base64Audio: string) => void;
  sendText: (text: string) => void;
  clearMessages: () => void;
}

export function useGeminiLive({
  apiKey,
  systemInstruction,
  onAudioResponse,
  onError,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState<{ role: 'user' | 'assistant'; text: string; id: string } | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const responseQueueRef = useRef<LiveServerMessage[]>([]);
  const processingRef = useRef(false);
  const currentTranscriptRef = useRef<{
    user: string;
    userId: string | null;
    assistant: string;
    assistantId: string | null;
  }>({
    user: '',
    userId: null,
    assistant: '',
    assistantId: null
  });
  const statusRef = useRef<ConnectionStatus>('disconnected');

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const addMessage = useCallback((role: 'user' | 'assistant', text: string, id?: string) => {
    if (!text.trim()) return;

    const message: ChatMessage = {
      id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const processResponseQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (responseQueueRef.current.length > 0) {
      const message = responseQueueRef.current.shift();
      if (!message) continue;

      // Handle audio data
      if (message.data) {
        const audioData = typeof message.data === 'string'
          ? message.data
          : Buffer.from(message.data).toString('base64');
        onAudioResponse?.(audioData);
      }

      // Handle server content (transcriptions)
      if (message.serverContent) {
        const content = message.serverContent;

        // Input transcription (user's speech)
        if (content.inputTranscription?.text) {
          const text = content.inputTranscription.text;

          if (!currentTranscriptRef.current.userId) {
            currentTranscriptRef.current.userId = `user-${Date.now()}`;
          }

          currentTranscriptRef.current.user += text;
          setCurrentTurn({
            role: 'user',
            text: currentTranscriptRef.current.user,
            id: currentTranscriptRef.current.userId
          });
        }

        // Output transcription (AI's speech)
        if (content.outputTranscription?.text) {
          const text = content.outputTranscription.text;

          // If there is a pending user message, commit it immediately so it doesn't disappear
          // when we switch currentTurn to the assistant
          if (currentTranscriptRef.current.user) {
            addMessage('user', currentTranscriptRef.current.user, currentTranscriptRef.current.userId || undefined);
            currentTranscriptRef.current.user = '';
            currentTranscriptRef.current.userId = null;
          }

          if (!currentTranscriptRef.current.assistantId) {
            currentTranscriptRef.current.assistantId = `assistant-${Date.now()}`;
          }

          currentTranscriptRef.current.assistant += text;
          setCurrentTurn({
            role: 'assistant',
            text: currentTranscriptRef.current.assistant,
            id: currentTranscriptRef.current.assistantId
          });
        }

        // Turn complete - finalize transcriptions
        if (content.turnComplete) {
          if (currentTranscriptRef.current.user) {
            addMessage('user', currentTranscriptRef.current.user, currentTranscriptRef.current.userId || undefined);
            currentTranscriptRef.current.user = '';
            currentTranscriptRef.current.userId = null;
          }
          if (currentTranscriptRef.current.assistant) {
            addMessage('assistant', currentTranscriptRef.current.assistant, currentTranscriptRef.current.assistantId || undefined);
            currentTranscriptRef.current.assistant = '';
            currentTranscriptRef.current.assistantId = null;
          }
          setCurrentTurn(null);
        }
      }
    }

    processingRef.current = false;
  }, [addMessage, onAudioResponse]);

  const connect = useCallback(async () => {
    if (!apiKey) {
      onError?.(new Error('API key is required'));
      return;
    }

    try {
      setStatus('connecting');

      aiRef.current = new GoogleGenAI({ apiKey });

      const config: any = {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      if (systemInstruction) {
        config.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const session = await aiRef.current.live.connect({
        model: GEMINI_MODEL,
        config,
        callbacks: {
          onopen: () => {
            console.log('[Navi] Connected to Gemini Live');
            setStatus('connected');
          },
          onmessage: (message: LiveServerMessage) => {
            responseQueueRef.current.push(message);
            processResponseQueue();
          },
          onerror: (error: ErrorEvent) => {
            console.error('[Navi] Connection error:', error);
            setStatus('error');
            onError?.(new Error(error.message || 'Connection error'));
          },
          onclose: (event: CloseEvent) => {
            console.log('[Navi] Connection closed:', event.reason);
            setStatus('disconnected');
          },
        },
      });

      sessionRef.current = session;
    } catch (error) {
      console.error('[Navi] Failed to connect:', error);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error('Failed to connect'));
    }
  }, [apiKey, systemInstruction, onError, processResponseQueue]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus('disconnected');
    responseQueueRef.current = [];
    currentTranscriptRef.current = { user: '', userId: null, assistant: '', assistantId: null };
    setCurrentTurn(null);
  }, []);

  const sendAudio = useCallback((base64Audio: string) => {
    if (!sessionRef.current) {
      console.warn('[Navi] Cannot send audio: no session');
      return;
    }

    if (statusRef.current !== 'connected') {
      console.warn('[Navi] Cannot send audio: status is', statusRef.current);
      return;
    }

    try {
      console.log('[Navi] Sending audio to Gemini, size:', base64Audio.length);
      sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
        },
      });
    } catch (error) {
      console.error('[Navi] Error sending audio:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to send audio'));
    }
  }, [onError]);

  const sendText = useCallback((text: string) => {
    if (!sessionRef.current || statusRef.current !== 'connected') {
      console.warn('[Navi] Cannot send text: not connected');
      return;
    }

    try {
      // Add user message immediately for text input
      addMessage('user', text);

      sessionRef.current.sendClientContent({
        turns: text,
        turnComplete: true,
      });
    } catch (error) {
      console.error('[Navi] Error sending text:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to send text'));
    }
  }, [addMessage, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentTurn(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    messages,
    currentTurn,
    connect,
    disconnect,
    sendAudio,
    sendText,
    clearMessages,
  };
}
