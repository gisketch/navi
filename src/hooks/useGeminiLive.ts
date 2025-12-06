import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { GEMINI_MODEL, AUDIO_CONFIG, type ChatMessage } from '../utils/constants';
import { TOOLS } from '../utils/tools';
import { pb } from '../utils/pocketbase';

const INPUT_SAMPLE_RATE = AUDIO_CONFIG.INPUT_SAMPLE_RATE;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ToolCall {
  functionCalls?: {
    id?: string;
    name?: string;
    args?: Record<string, any>;
  }[];
}

interface ToolResponse {
  functionResponses: {
    id: string;
    name: string;
    response: Record<string, any>;
  }[];
}

interface UseGeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  onAudioResponse?: (audioData: string) => void;
  onError?: (error: Error) => void;
  saveNoteWebhook: string;
}

interface UseGeminiLiveReturn {
  status: ConnectionStatus;
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  liveStatus: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (base64Audio: string) => void;
  sendText: (text: string) => void;
  clearMessages: () => void;
  isToolActive: boolean;
}

export function useGeminiLive({
  apiKey,
  systemInstruction,
  onAudioResponse,
  onError,
  saveNoteWebhook,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState<{ role: 'user' | 'assistant'; text: string; id: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [isToolActive, setIsToolActive] = useState(false);

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
  // Track active agentic task (one at a time)
  const activeTaskRef = useRef<{ id: string; processingText: string; savingText: string } | null>(null);

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

  // Handle Tool Calls
  const handleToolCall = useCallback(async (toolCall: ToolCall) => {
    const functionCalls = toolCall.functionCalls;
    if (!functionCalls || functionCalls.length === 0) return;

    for (const call of functionCalls) {
      if (call.name === 'saveNote') {
        const { content, processingText, savingText } = call.args as any;
        const taskId = crypto.randomUUID();

        console.log('[Navi] Tool Call: saveNote', { taskId, content, processingText, savingText });

        // 1. Set Status UI
        activeTaskRef.current = { id: taskId, processingText, savingText };
        setLiveStatus(processingText);
        setIsToolActive(true);

        // 2. Trigger Webhook
        try {
          await fetch(saveNoteWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, content }),
          });
        } catch (err) {
          console.error('[Navi] Webhook failed', err);
          setLiveStatus(null);
          setIsToolActive(false);
          activeTaskRef.current = null;

          // Send Error Response
          sessionRef.current?.sendToolResponse({
            functionResponses: [{
              id: call.id || 'unknown',
              name: call.name || 'unknown',
              response: { error: `Failed to trigger action. Error: ${err instanceof Error ? err.message : String(err)}. Please respond sadly to the user about this failure.` }
            }]
          });
          return;
        }

        // 3. Subscribe to PocketBase updates
        // We defer the response to Gemini until completion
        console.log(`[Navi] Subscribing to task_updates for ${taskId}`);
        try {
          // Subscribe to ALL updates in the collection and filter client-side
          // because we don't know the Record ID yet.
          await pb.collection('task_updates').subscribe('*', (e) => {
            const record = e.record;
            if (record.task_id === taskId) {
              console.log('[Navi] PB Update:', record.status, record.message);

              if (record.status === 'processing') {
                // Already set, but ensure consistency
                setLiveStatus(processingText);
              } else if (record.status === 'saving') {
                setLiveStatus(savingText);
              } else if (record.status === 'completed') {
                // Task Completed
                setLiveStatus(null);
                setIsToolActive(false);
                pb.collection('task_updates').unsubscribe(); // Cleanup
                activeTaskRef.current = null;

                // 4. Send Tool Response to Gemini
                const response: ToolResponse = {
                  functionResponses: [{
                    id: call.id || 'unknown',
                    name: call.name || 'unknown',
                    response: { result: `Note saved successfully. File: ${record.message}. Tell the user you saved it and Ask the user: "Would you like to see it?"` }
                  }]
                };

                // Add a space to separate pre-tool text from post-tool text
                if (currentTranscriptRef.current.assistant && !currentTranscriptRef.current.assistant.endsWith(' ')) {
                  currentTranscriptRef.current.assistant += ' ';
                  // Update current turn if it exists and is assistant
                  setCurrentTurn(prev => {
                    if (prev && prev.role === 'assistant' && prev.id === currentTranscriptRef.current.assistantId) {
                      return { ...prev, text: currentTranscriptRef.current.assistant };
                    }
                    return prev;
                  });
                }

                console.log('[Navi] Sending Tool Response');
                sessionRef.current?.sendToolResponse(response);
              } else if (record.status === 'error') {
                setLiveStatus(null);
                setIsToolActive(false);
                pb.collection('task_updates').unsubscribe(); // Cleanup
                activeTaskRef.current = null;

                // Send Error Response
                sessionRef.current?.sendToolResponse({
                  functionResponses: [{
                    id: call.id || 'unknown',
                    name: call.name || 'unknown',
                    response: { error: record.message || "Unknown error occurred" }
                  }]
                });
              }
            }
          });
        } catch (pbError) {
          console.error('[Navi] PB Subscribe Error', pbError);
          setLiveStatus(null);
          setIsToolActive(false);
          activeTaskRef.current = null;

          sessionRef.current?.sendToolResponse({
            functionResponses: [{
              id: call.id || 'unknown',
              name: call.name || 'unknown',
              response: { error: `Failed to subscribe to updates. Error: ${pbError}. Please respond sadly to the user about this failure.` }
            }]
          });
        }

        // We do NOT add to functionResponses here because we are handling it asynchronously via PB.
        // This effectively "holds" the turn.
      } else if (call.name === 'openObsidianNote') {
        const { filename } = call.args as any;
        console.log('[Navi] Tool Call: openObsidianNote', { filename });

        setLiveStatus('Opening Obsidian...');
        setIsToolActive(true);

        // Construct Obsidian URI - Using SEARCH to handle sync delays
        // "open" fails if file doesn't exist yet. "search" works immediately and shows result when synced.
        const uri = `obsidian://search?query=${encodeURIComponent(filename)}`;

        // Use existing window to open the URI Scheme
        // valid for PWA/Mobile usually to trigger intent
        window.open(uri, '_self');

        // Simulate a brief delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 1000));

        setLiveStatus(null);
        setIsToolActive(false);

        sessionRef.current?.sendToolResponse({
          functionResponses: [{
            id: call.id || 'unknown',
            name: call.name || 'unknown',
            response: { result: 'Obsidian opened successfully.' }
          }]
        });
      }
    }
  }, [saveNoteWebhook]);

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

      // Handle Tool Call
      if (message.toolCall) {
        await handleToolCall(message.toolCall);
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
  }, [addMessage, onAudioResponse, handleToolCall]);

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
        tools: TOOLS, // Add Tools
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
    // Cleanup active PB subscriptions
    if (activeTaskRef.current) {
      pb.collection('task_updates').unsubscribe();
      activeTaskRef.current = null;
    }

    setStatus('disconnected');
    setLiveStatus(null);
    setIsToolActive(false);
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
      // Create a specific log for audio sending to reduce noise?
      // console.log('[Navi] Sending audio to Gemini, size:', base64Audio.length);
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
    liveStatus, // Expose live status
    isToolActive, // Expose tool active state
    connect,
    disconnect,
    sendAudio,
    sendText,
    clearMessages,
  };
}
