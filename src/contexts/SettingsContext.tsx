import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import type { MicMode } from '../utils/constants';

// ============================================
// Settings Context
// ============================================
// Manages persisted app settings (localStorage)

interface SettingsContextType {
  // API & Connection
  apiKey: string;
  setApiKey: (key: string) => void;
  
  // Voice & AI
  systemInstruction: string;
  setSystemInstruction: (instruction: string) => void;
  voiceName: string;
  setVoiceName: (name: string) => void;
  naviBrainWebhook: string;
  setNaviBrainWebhook: (url: string) => void;
  
  // Behavior
  micMode: MicMode;
  setMicMode: (mode: MicMode) => void;
  receiveNoteContent: boolean;
  setReceiveNoteContent: (value: boolean) => void;
  
  // Computed
  hasApiKey: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // All persisted settings using localStorage
  const [apiKey, setApiKey] = useLocalStorage(STORAGE_KEYS.API_KEY, DEFAULT_SETTINGS.apiKey);
  const [systemInstruction, setSystemInstruction] = useLocalStorage(STORAGE_KEYS.SYSTEM_INSTRUCTION, '');
  const [micMode, setMicMode] = useLocalStorage<MicMode>(STORAGE_KEYS.MIC_MODE, DEFAULT_SETTINGS.micMode);
  const [naviBrainWebhook, setNaviBrainWebhook] = useLocalStorage(STORAGE_KEYS.NAVI_BRAIN_WEBHOOK, DEFAULT_SETTINGS.naviBrainWebhook);
  const [voiceName, setVoiceName] = useLocalStorage(STORAGE_KEYS.VOICE_NAME, DEFAULT_SETTINGS.voiceName);
  const [receiveNoteContent, setReceiveNoteContent] = useLocalStorage(STORAGE_KEYS.RECEIVE_NOTE_CONTENT, DEFAULT_SETTINGS.receiveNoteContent);

  // Fetch System Prompt from webhook on mount
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const response = await fetch('https://automate.gisketch.com/webhook/navi-prompt');
        if (!response.ok) throw new Error('Failed to fetch prompt');

        const data = await response.json();
        if (data.exists && data.content) {
          console.log('[Settings] Updated system instruction from webhook');
          setSystemInstruction(data.content);
        }
      } catch (e) {
        console.error('[Settings] Failed to fetch system prompt:', e);
      }
    };
    fetchPrompt();
  }, [setSystemInstruction]);

  const value = useMemo<SettingsContextType>(() => ({
    // API & Connection
    apiKey,
    setApiKey,
    
    // Voice & AI
    systemInstruction,
    setSystemInstruction,
    voiceName,
    setVoiceName,
    naviBrainWebhook,
    setNaviBrainWebhook,
    
    // Behavior
    micMode,
    setMicMode,
    receiveNoteContent,
    setReceiveNoteContent,
    
    // Computed
    hasApiKey: !!apiKey,
  }), [
    apiKey, setApiKey,
    systemInstruction, setSystemInstruction,
    voiceName, setVoiceName,
    naviBrainWebhook, setNaviBrainWebhook,
    micMode, setMicMode,
    receiveNoteContent, setReceiveNoteContent,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
