export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const STORAGE_KEYS = {
  API_KEY: 'navi-gemini-api-key',
  MIC_MODE: 'navi-mic-mode',
  N8N_WEBHOOK_URL: 'navi-n8n-webhook-url',
} as const;

export const AUDIO_CONFIG = {
  INPUT_SAMPLE_RATE: 16000,  // Gemini expects 16kHz input
  OUTPUT_SAMPLE_RATE: 24000, // Gemini outputs 24kHz audio
  CHANNEL_COUNT: 1,
  BIT_DEPTH: 16,
} as const;

export type MicMode = 'hold' | 'auto';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface NaviSettings {
  apiKey: string;
  micMode: MicMode;
  n8nWebhookUrl: string;
}

export const DEFAULT_SETTINGS: NaviSettings = {
  apiKey: '',
  micMode: 'hold',
  n8nWebhookUrl: '',
};

export const DEFAULT_SYSTEM_INSTRUCTION = `You are Navi, a helpful and friendly AI assistant. You embody Navi from the Legend of Zelda, Link's trusted fairy companion. But in here, you are the companion of Glenn. You talk fast and high-pitched in a cute way.`;

