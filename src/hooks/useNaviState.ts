import { useMemo } from 'react';

// ============================================
// Navi State Hook
// ============================================
// Computes Navi's visual state based on app state
// Extracted from App.tsx for better separation of concerns

export type NaviState = 'offline' | 'idle' | 'listening' | 'thinking' | 'speaking';
export type AppMode = 'dashboard' | 'chat';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseNaviStateOptions {
  mode: AppMode;
  hasInitialDataLoaded: boolean;
  isToolActive: boolean;
  isPlaying: boolean;
  isCapturing: boolean;
  connectionStatus: ConnectionStatus;
  isFinanceVoiceActive?: boolean; // Finance overlay active (uses voice in dashboard mode)
}

/**
 * Computes Navi's visual state based on the current app state.
 * 
 * In dashboard mode (without finance voice):
 * - Returns 'offline' until initial data loads
 * - Returns 'idle' once data has loaded (not connected to Gemini)
 * 
 * In chat mode OR finance voice mode:
 * - 'thinking' when AI tool is active
 * - 'speaking' when audio is playing
 * - 'listening' when capturing user audio
 * - 'idle' when connected but not doing anything
 * - 'offline' when disconnected
 */
export function useNaviState(options: UseNaviStateOptions): NaviState {
  const {
    mode,
    hasInitialDataLoaded,
    isToolActive,
    isPlaying,
    isCapturing,
    connectionStatus,
    isFinanceVoiceActive = false,
  } = options;

  return useMemo<NaviState>(() => {
    // Finance voice mode in dashboard - treat like chat mode for Navi state
    if (isFinanceVoiceActive) {
      if (isToolActive) return 'thinking';
      if (isPlaying) return 'speaking';
      if (isCapturing) return 'listening';
      if (connectionStatus === 'connected' || connectionStatus === 'connecting') return 'idle';
      return 'offline';
    }
    
    if (mode === 'dashboard') {
      // Dashboard mode: Navi is "idle" once data loads (not connected to Gemini)
      return hasInitialDataLoaded ? 'idle' : 'offline';
    }
    
    // Chat mode: based on actual connection state
    if (isToolActive) return 'thinking';
    if (isPlaying) return 'speaking';
    if (isCapturing) return 'listening';
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') return 'idle';
    
    return 'offline';
  }, [mode, hasInitialDataLoaded, isToolActive, isPlaying, isCapturing, connectionStatus, isFinanceVoiceActive]);
}
