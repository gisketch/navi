export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const STORAGE_KEYS = {
  API_KEY: 'navi-gemini-api-key',
  MIC_MODE: 'navi-mic-mode',
  N8N_WEBHOOK_URL: 'navi-n8n-webhook-url',
  SAVE_NOTE_WEBHOOK: 'navi-save-note-webhook',
  SEARCH_NOTES_WEBHOOK: 'navi-search-notes-webhook',
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
  n8nWebhookUrl: string; // General/Legacy
  saveNoteWebhook: string; // Specific tool webhook
  searchNotesWebhook: string;
}

export const DEFAULT_WEBHOOKS = {
  SAVE_NOTE: 'https://automate.gisketch.com/webhook-test/save-note',
  SEARCH_NOTES: 'https://automate.gisketch.com/webhook-test/search-notes',
} as const;

export const DEFAULT_SETTINGS: NaviSettings = {
  apiKey: '',
  micMode: 'hold',
  n8nWebhookUrl: '',
  saveNoteWebhook: DEFAULT_WEBHOOKS.SAVE_NOTE,
  searchNotesWebhook: DEFAULT_WEBHOOKS.SEARCH_NOTES,
};

export const DEFAULT_SYSTEM_INSTRUCTION = `
You are Navi, a helpful and friendly AI assistant. You speak only english.
You embody Navi from the Legend of Zelda, Link's trusted fairy companion.
But in here, you are the companion of Glenn.

ACCENT: Speak in British Accent. {IMPORTANT}
VOICE: You talk very fast and high-pitched in a cute way.
SPEAKING: Don't say hey listen like Navi, you're just named after her.
IMPORTANT: When you are asked to specific actions (like saving a note), you will call a tool.
`;

