import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_CONFIG } from '../utils/constants';

const TARGET_SAMPLE_RATE = AUDIO_CONFIG.INPUT_SAMPLE_RATE;

interface UseAudioCaptureOptions {
  onAudioData: (base64Audio: string) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  isInitialized: boolean;
  audioLevel: number;
  initialize: () => Promise<void>;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  cleanup: () => void;
}

// Convert Int16Array to base64 string
function int16ToBase64(int16Array: Int16Array): string {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

export function useAudioCapture({
  onAudioData,
  onAudioLevel,
  onError,
}: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const isCapturingRef = useRef(false);
  const chunkCountRef = useRef(0);

  // Store callback in ref so processor always has latest reference
  const onAudioDataRef = useRef(onAudioData);
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  const initialize = useCallback(async () => {
    if (isInitialized) {
      console.log('[Navi] Audio already initialized');
      return;
    }

    try {
      console.log('[Navi] Requesting microphone access...');

      // Request microphone access - don't force sample rate, use device default
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CONFIG.CHANNEL_COUNT,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Create audio context with device's default sample rate (don't specify)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      console.log(`[Navi] AudioContext sample rate: ${audioContext.sampleRate}Hz, target: ${TARGET_SAMPLE_RATE}Hz`);

      // Load the AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.js');

      // Create source from microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create processor node with target sample rate for resampling
      const processor = new AudioWorkletNode(audioContext, 'pcm-processor', {
        processorOptions: {
          targetSampleRate: TARGET_SAMPLE_RATE,
        },
      });

      // Handle messages from processor - use ref to always get latest callback
      processor.port.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'debug') {
          // Debug info from processor
          const level = Math.min(1, event.data.maxSample * 5); // Amplify for visibility
          setAudioLevel(level);
          onAudioLevel?.(level);
          return;
        }

        if (!isCapturingRef.current) {
          return;
        }

        if (event.data.type === 'pcm') {
          chunkCountRef.current++;
          const base64Audio = int16ToBase64(event.data.data);
          onAudioDataRef.current(base64Audio);
        }
      };

      processorRef.current = processor;

      // Connect source to processor (but not to destination - we don't want to hear ourselves)
      source.connect(processor);

      setIsInitialized(true);
      console.log('[Navi] Audio capture initialized');
    } catch (error) {
      console.error('[Navi] Failed to initialize audio capture:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to initialize microphone'));
    }
  }, [isInitialized, onError]);

  const startCapture = useCallback(async () => {
    // Initialize if not already done
    if (!isInitialized) {
      console.log('[Navi] Audio not initialized, initializing first...');
      await initialize();
    }

    if (isCapturingRef.current) {
      console.log('[Navi] Already capturing');
      return;
    }

    // Resume audio context if suspended (required for iOS)
    if (audioContextRef.current?.state === 'suspended') {
      console.log('[Navi] Resuming suspended AudioContext');
      await audioContextRef.current.resume();
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    console.log('[Navi] Started audio capture');
  }, [isInitialized, initialize]);

  const stopCapture = useCallback(() => {
    if (!isCapturingRef.current) return;

    isCapturingRef.current = false;
    setIsCapturing(false);
    console.log('[Navi] Stopped audio capture');
  }, []);

  const cleanup = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsInitialized(false);
    console.log('[Navi] Audio capture cleaned up');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isCapturing,
    isInitialized,
    audioLevel,
    initialize,
    startCapture,
    stopCapture,
    cleanup,
  };
}
