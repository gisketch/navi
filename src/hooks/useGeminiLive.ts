import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { GEMINI_MODEL, AUDIO_CONFIG, type ChatMessage, type CardData } from '../utils/constants';
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
  naviBrainWebhook: string;
  voiceName: string;
}

interface UseGeminiLiveReturn {
  status: ConnectionStatus;
  messages: ChatMessage[];
  currentTurn: { role: 'user' | 'assistant'; text: string; id: string } | null;
  liveStatus: string | null;
  isToolActive: boolean;
  activeCards: CardData[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (base64Audio: string) => void;
  sendText: (text: string) => void;
  clearMessages: () => void;
  clearCards: () => void;
}

export function useGeminiLive({
  apiKey,
  systemInstruction,
  onAudioResponse,
  onError,
  naviBrainWebhook,
  voiceName,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState<{ role: 'user' | 'assistant'; text: string; id: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [isToolActive, setIsToolActive] = useState(false);
  const [activeCards, setActiveCards] = useState<CardData[]>([]);

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
  const activeTaskRef = useRef<{ id: string; processingText: string; } | null>(null);

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
      if (call.name === 'access_digital_brain') {
        const { instruction, processingText } = call.args as any;
        const taskId = crypto.randomUUID();

        console.log('[Navi] Tool Call: access_digital_brain', { taskId, instruction, processingText });

        // 0. Reset Cards on new Search
        setActiveCards([]);

        // 1. Set Status UI
        activeTaskRef.current = { id: taskId, processingText };
        setLiveStatus(processingText);
        setIsToolActive(true);

        // 2. Trigger Webhook
        try {
          const response = await fetch(naviBrainWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, instruction }),
          });

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.error('[Navi] Brain Webhook failed', err);
          setLiveStatus(null);
          setIsToolActive(false);
          activeTaskRef.current = null;

          // Send Error Response as a Result so the model acknowledges it verbally
          sessionRef.current?.sendToolResponse({
            functionResponses: [{
              id: call.id || 'unknown',
              name: call.name || 'unknown',
              response: { result: `SYSTEM ERROR: The digital brain is unreachable. Error details: ${err instanceof Error ? err.message : String(err)}. Inform the user that you cannot access the notes right now.` }
            }]
          });
          return;
        }

        // 3. Subscribe to PocketBase updates
        console.log(`[Navi] Subscribing to task_updates for ${taskId}`);
        try {
          await pb.collection('task_updates').subscribe('*', (e) => {
            const record = e.record;
            if (record.task_id === taskId) {
              console.log('[Navi] PB Update:', record.status, record.message);

              if (record.status === 'processing') {
                // Dynamic Status Update
                if (record.message) {
                  setLiveStatus(record.message);
                } else {
                  setLiveStatus(processingText);
                }
              } else if (record.status === 'completed') {
                // Task Completed
                setLiveStatus(null);
                setIsToolActive(false);
                pb.collection('task_updates').unsubscribe(); // Cleanup
                activeTaskRef.current = null;

                // Extract summary from JSON message
                let summary = "";
                let cards = []
                let nextSteps = "";
                try {
                  // Try to get data from final_output first (for completion), then fallback to message
                  const rawData = record.final_output || record.message;

                  const data = typeof rawData === 'string'
                    ? JSON.parse(rawData)
                    : rawData;

                  // Handle Card Data Extraction
                  if (data && Array.isArray(data.relevant_data)) {
                    setActiveCards(data.relevant_data);
                    cards = data.relevant_data;
                  }

                  if (data && data.summary) {
                    summary = data.summary;
                  } else {
                    // Fallback implies the entire message is the result
                    summary = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
                  }

                  if (data && data.suggested_next_step) {
                    nextSteps = data.suggested_next_step;
                  } else {
                    // Fallback implies the entire message is the result
                    nextSteps = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
                  }
                } catch (e) {
                  // Not JSON, use raw text from message as fallback
                  summary = record.message;
                }

                const response: ToolResponse = {
                  functionResponses: [{
                    id: call.id || 'unknown',
                    name: call.name || 'unknown',
                    response: { result: `The Brain Result: ${summary} || ${cards.length > 0 ? "Showing these data to the user through UI: " + cards.toString() : "" } ${nextSteps && "|| Brain's Suggested next steps: " + nextSteps}` }
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
              response: { error: `Failed to subscribe to updates. Error: ${pbError}` }
            }]
          });
        }
      } else if (call.name === 'openObsidianNote') {
        const { filename } = call.args as any;
        console.log('[Navi] Tool Call: openObsidianNote', { filename });

        setLiveStatus('Opening Obsidian...');
        setIsToolActive(true);

        const uri = `obsidian://search?query=${encodeURIComponent(filename)}`;
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
  }, [naviBrainWebhook]);

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
            // Clear cards on new user message?
            setActiveCards([]);
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
            // Clear cards if user spoke
            setActiveCards([]);

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
        generationConfig: {
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
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
  }, [apiKey, systemInstruction, onError, processResponseQueue, voiceName]);

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
    setActiveCards([]); // Clear cards on disconnect
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
      setActiveCards([]); // Clear cards on new text input

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
    liveStatus,
    isToolActive,
    activeCards,
    connect,
    disconnect,
    sendAudio,
    sendText,
    clearMessages,
    clearCards: () => setActiveCards([]),
  };
}
