import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// Types
// ============================================

export type CameraFacing = 'user' | 'environment';
export type CameraMode = 'off' | 'streaming' | 'snapshot';

export interface CameraState {
  isActive: boolean;
  mode: CameraMode;
  facing: CameraFacing;
  hasPermission: boolean | null;
  error: string | null;
}

export interface UseCameraOptions {
  /** Initial camera facing direction */
  initialFacing?: CameraFacing;
  /** Target width for video capture */
  width?: number;
  /** Target height for video capture */
  height?: number;
  /** Frames per second for continuous streaming */
  fps?: number;
  /** Quality for JPEG snapshots (0-1) */
  quality?: number;
  /** Callback when a frame is captured (base64 JPEG) */
  onFrame?: (base64Image: string) => void;
}

export interface UseCameraReturn {
  /** Current camera state */
  state: CameraState;
  /** Ref to attach to video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Start camera with optional mode */
  startCamera: (mode?: CameraMode) => Promise<boolean>;
  /** Stop camera completely */
  stopCamera: () => void;
  /** Switch between front/back camera */
  flipCamera: () => Promise<void>;
  /** Take a single snapshot and return base64 */
  takeSnapshot: () => string | null;
  /** Toggle between streaming and snapshot mode */
  setMode: (mode: CameraMode) => void;
  /** Pause/resume streaming without stopping camera */
  pauseStreaming: () => void;
  resumeStreaming: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useCamera({
  initialFacing = 'environment',
  width = 640,
  height = 480,
  fps = 1, // 1 frame per second by default (for Live API token efficiency)
  quality = 0.7,
  onFrame,
}: UseCameraOptions = {}): UseCameraReturn {
  const [state, setState] = useState<CameraState>({
    isActive: false,
    mode: 'off',
    facing: initialFacing,
    hasPermission: null,
    error: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Create canvas for frame capture
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    return () => {
      canvasRef.current = null;
    };
  }, [width, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture a single frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video) {
      console.warn('[Camera] captureFrame: No video element ref');
      return null;
    }
    if (!canvas) {
      console.warn('[Camera] captureFrame: No canvas');
      return null;
    }
    if (video.readyState < 2) {
      console.warn('[Camera] captureFrame: Video not ready, readyState:', video.readyState);
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Remove the data URL prefix to get just the base64
    return dataUrl.split(',')[1] || null;
  }, [quality]);

  // Start frame streaming
  const startFrameStreaming = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    const intervalMs = 1000 / fps;
    console.log('[Camera] Starting frame streaming at', fps, 'FPS (interval:', intervalMs, 'ms)');
    
    frameIntervalRef.current = window.setInterval(() => {
      if (isPausedRef.current) return;
      
      const frame = captureFrame();
      if (frame && onFrame) {
        console.log('[Camera] Sending frame, size:', frame.length, 'chars');
        onFrame(frame);
      }
    }, intervalMs);
  }, [fps, captureFrame, onFrame]);

  // Stop frame streaming
  const stopFrameStreaming = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  // Wait for video to be ready
  const waitForVideoReady = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) {
        console.warn('[Camera] waitForVideoReady: No video element');
        resolve();
        return;
      }
      
      // Already ready
      if (video.readyState >= 2) {
        console.log('[Camera] Video already ready, readyState:', video.readyState);
        resolve();
        return;
      }

      console.log('[Camera] Waiting for video to be ready...');
      
      const onReady = () => {
        console.log('[Camera] Video now ready, readyState:', video.readyState);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        resolve();
      };

      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);

      // Timeout fallback after 3 seconds
      setTimeout(() => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        console.log('[Camera] Video ready timeout, proceeding anyway, readyState:', video.readyState);
        resolve();
      }, 3000);
    });
  }, []);

  // Start camera
  const startCamera = useCallback(async (mode: CameraMode = 'streaming'): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: state.facing,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach to video element and wait for it to be ready
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[Camera] Stream attached, starting playback...');
        await videoRef.current.play();
        console.log('[Camera] Playback started, waiting for video ready...');
        await waitForVideoReady();
      } else {
        console.warn('[Camera] No video element ref available!');
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        mode,
        hasPermission: true,
        error: null,
      }));

      // Start streaming if in streaming mode
      if (mode === 'streaming' && onFrame) {
        console.log('[Camera] Starting frame streaming...');
        startFrameStreaming();
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera access denied';
      console.error('[Camera] Error starting camera:', error);
      
      setState(prev => ({
        ...prev,
        isActive: false,
        mode: 'off',
        hasPermission: false,
        error: message,
      }));

      return false;
    }
  }, [state.facing, width, height, onFrame, startFrameStreaming]);

  // Stop camera
  const stopCamera = useCallback(() => {
    stopFrameStreaming();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      mode: 'off',
    }));
  }, [stopFrameStreaming]);

  // Flip camera
  const flipCamera = useCallback(async () => {
    const newFacing = state.facing === 'user' ? 'environment' : 'user';
    const wasActive = state.isActive;
    const currentMode = state.mode;

    // Stop current camera
    stopCamera();

    // Update facing
    setState(prev => ({ ...prev, facing: newFacing }));

    // Restart if was active
    if (wasActive) {
      // Small delay to allow state update
      setTimeout(() => {
        startCamera(currentMode);
      }, 100);
    }
  }, [state.facing, state.isActive, state.mode, stopCamera, startCamera]);

  // Take snapshot
  const takeSnapshot = useCallback((): string | null => {
    const frame = captureFrame();
    if (frame && onFrame) {
      onFrame(frame);
    }
    return frame;
  }, [captureFrame, onFrame]);

  // Set mode
  const setMode = useCallback((mode: CameraMode) => {
    if (mode === 'off') {
      stopCamera();
      return;
    }

    setState(prev => ({ ...prev, mode }));

    if (mode === 'streaming' && state.isActive && onFrame) {
      startFrameStreaming();
    } else if (mode === 'snapshot') {
      stopFrameStreaming();
    }
  }, [state.isActive, onFrame, startFrameStreaming, stopFrameStreaming, stopCamera]);

  // Pause streaming
  const pauseStreaming = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  // Resume streaming
  const resumeStreaming = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  return {
    state,
    videoRef,
    startCamera,
    stopCamera,
    flipCamera,
    takeSnapshot,
    setMode,
    pauseStreaming,
    resumeStreaming,
  };
}
