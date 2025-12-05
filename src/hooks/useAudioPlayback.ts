import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_CONFIG } from '../utils/constants';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  queueAudio: (base64Audio: string) => void;
  stopPlayback: () => void;
  cleanup: () => void;
}

// Convert base64 PCM to Float32Array
function base64ToFloat32(base64: string): Float32Array {
  // Decode base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert to Int16 (16-bit PCM)
  const int16Array = new Int16Array(bytes.buffer);

  // Convert Int16 to Float32 for Web Audio API
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
  }

  return float32Array;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  // Initialize audio context lazily (needs user interaction on iOS)
  const getAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    // Resume if suspended (iOS requirement)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  const queueAudio = useCallback(async (base64Audio: string) => {
    try {
      const audioContext = await getAudioContext();
      const float32Data = base64ToFloat32(base64Audio);
      
      if (float32Data.length === 0) return;

      // Create AudioBuffer at the correct sample rate
      const audioBuffer = audioContext.createBuffer(
        1, 
        float32Data.length, 
        AUDIO_CONFIG.OUTPUT_SAMPLE_RATE
      );
      audioBuffer.getChannelData(0).set(float32Data);

      // Create and configure source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Schedule playback - ensure gapless by tracking next start time
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      
      // Update next start time based on buffer duration
      const duration = audioBuffer.length / AUDIO_CONFIG.OUTPUT_SAMPLE_RATE;
      nextStartTimeRef.current = startTime + duration;

      source.start(startTime);
      scheduledSourcesRef.current.push(source);

      // Clean up finished sources
      source.onended = () => {
        const index = scheduledSourcesRef.current.indexOf(source);
        if (index > -1) {
          scheduledSourcesRef.current.splice(index, 1);
        }
        
        // Update isPlaying state
        if (scheduledSourcesRef.current.length === 0) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      };

      // Update playing state
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[Navi] Error queuing audio:', error);
    }
  }, [getAudioContext]);

  const stopPlayback = useCallback(() => {
    // Stop all scheduled sources
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // Ignore errors if already stopped
      }
    });
    scheduledSourcesRef.current = [];
    
    // Reset timing
    nextStartTimeRef.current = 0;
    
    isPlayingRef.current = false;
    setIsPlaying(false);
    console.log('[Navi] Playback stopped');
  }, []);

  const cleanup = useCallback(() => {
    stopPlayback();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    console.log('[Navi] Audio playback cleaned up');
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isPlaying,
    queueAudio,
    stopPlayback,
    cleanup,
  };
}
