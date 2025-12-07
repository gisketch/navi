export const GEMINI_MODEL = 'models/gemini-2.0-flash-exp';

export const AUDIO_CONFIG = {
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000, // Gemini currently outputs 24kHz
};

export const STORAGE_KEYS = {
  API_KEY: 'navi_gemini_api_key',
  SYSTEM_INSTRUCTION: 'navi_system_instruction',
  MIC_MODE: 'navi_mic_mode',
  NAVI_BRAIN_WEBHOOK: 'navi_brain_webhook',
  VOICE_NAME: 'navi_voice_name',
};

export interface CardData {
  card_type: 'notes' | 'calendar' | 'other';
  card_title: string;
  card_description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  cards?: CardData[];
}

export interface WebhookConfig {
  url: string;
  method: 'POST';
}

export interface NaviSettings {
  apiKey: string;
  systemInstruction?: string;
  micMode: 'manual' | 'auto';
  naviBrainWebhook: string;
  voiceName: string;
}

export const DEFAULT_WEBHOOKS = {
  NAVI_BRAIN: 'https://automate.gisketch.com/webhook/navi-brain',
};

export const VOICE_OPTIONS = [
  { value: 'Puck', label: 'Puck (Male)' },
  { value: 'Charon', label: 'Charon (Male)' },
  { value: 'Kore', label: 'Kore (Female)' },
  { value: 'Fenrir', label: 'Fenrir (Male)' },
  { value: 'Aoede', label: 'Aoede (Female)' },
] as const;

export type VoiceName = typeof VOICE_OPTIONS[number]['value'];

export const DEFAULT_SETTINGS: NaviSettings = {
  apiKey: '',
  micMode: 'manual',
  naviBrainWebhook: DEFAULT_WEBHOOKS.NAVI_BRAIN,
  voiceName: 'Aoede',
};
