export const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';

export const AUDIO_CONFIG = {
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000, // Gemini currently outputs 24kHz
  CHANNEL_COUNT: 1,
};

export const STORAGE_KEYS = {
  API_KEY: 'navi_gemini_api_key',
  SYSTEM_INSTRUCTION: 'navi_system_instruction',
  MIC_MODE: 'navi_mic_mode',
  NAVI_BRAIN_WEBHOOK: 'navi_brain_webhook',
  VOICE_NAME: 'navi_voice_name',
  RECEIVE_NOTE_CONTENT: 'navi_receive_note_content',
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
  receiveNoteContent: boolean;
}

export type MicMode = NaviSettings['micMode'];

export const DEFAULT_WEBHOOKS = {
  NAVI_BRAIN: 'https://automate.gisketch.com/webhook/navi-brain',
};

export const VOICE_OPTIONS = [
  { value: 'Achird', label: 'Achird (Youthful)' },
  { value: 'Algenib', label: 'Algenib (Warm)' },
  { value: 'Aoede', label: 'Aoede (Clear)' },
  { value: 'Callirrhoe', label: 'Callirrhoe (Confident)' },
  { value: 'Despina', label: 'Despina (Warm)' },
  { value: 'Erinome', label: 'Erinome (Professional)' },
  { value: 'Kore', label: 'Kore (Energetic)' },
  { value: 'Laomedeia', label: 'Laomedeia (Clear)' },
  { value: 'Leda', label: 'Leda (Composed)' },
  { value: 'Pulcherrima', label: 'Pulcherrima (Bright)' },
  { value: 'Sulafat', label: 'Sulafat (Warm)' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix (Calm)' },
  { value: 'Zephyr', label: 'Zephyr (Energetic)' },
] as const;

export type VoiceName = typeof VOICE_OPTIONS[number]['value'];

export const DEFAULT_SETTINGS: NaviSettings = {
  apiKey: '',
  micMode: 'auto',
  naviBrainWebhook: DEFAULT_WEBHOOKS.NAVI_BRAIN,
  voiceName: 'Kore',
  receiveNoteContent: true,
};

// ============================================
// OVERNIGHT SUMMARY / DASHBOARD TYPES
// ============================================

export type UrgencyLevel = 'urgent' | 'high' | 'medium' | 'low';

export interface OvernightCard {
  id: string;
  title: string;
  description: string;
  content: string; // Full content shown in modal
  urgency: UrgencyLevel;
  icon: string; // Lucide icon name (e.g., 'Mail', 'DollarSign', 'Calendar')
  category: string; // e.g., 'email', 'finance', 'work', 'personal'
  created: string; // ISO timestamp
}

export interface DailySummary {
  id: string;
  summary: string; // AI-generated summary of everything
  created: string;
}

// PocketBase collection names
export const POCKETBASE_COLLECTIONS = {
  OVERNIGHT_CARDS: 'overnight_cards',
  DAILY_SUMMARIES: 'daily_summaries',
};

// ============================================
// MOCK DATA - Remove when connected to real PocketBase
// ============================================

export const MOCK_DAILY_SUMMARY: DailySummary = {
  id: 'mock-summary-1',
  summary: "Hey Ghegi! While you slept, you got 3 emails - one from your manager about tomorrow's standup, a GitHub notification about a merged PR, and a newsletter you can ignore. Your AWS bill for November came in at $12.47. Nothing urgent, but maybe check that standup email first!",
  created: new Date().toISOString(),
};

export const MOCK_OVERNIGHT_CARDS: OvernightCard[] = [
  {
    id: 'mock-1',
    title: 'Work Emails',
    description: '3 new messages, 1 needs response',
    content: `## Work Email Summary

**From Manager (Sarah)** - 8:42 PM
> Quick heads up - tomorrow's standup moved to 10am instead of 9am. Also, great work on the dashboard feature!

**GitHub Notification** - 11:23 PM  
> PR #142 "Add overnight summary feature" was merged by @teammate

**Team Newsletter** - 6:00 AM
> Weekly digest - can review later

### Action Items
- [ ] Acknowledge Sarah's message
- [ ] Check PR #142 is deployed correctly`,
    urgency: 'high',
    icon: 'Mail',
    category: 'email',
    created: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'AWS Billing',
    description: '$12.47 for November',
    content: `## AWS November Bill

**Total: $12.47** (down from $15.23 last month 📉)

### Breakdown
- EC2: $8.20
- S3: $2.15  
- Route53: $1.50
- Data Transfer: $0.62

### Notes
Budget is $20/month - you're well under! The decrease is from stopping that test instance last week.`,
    urgency: 'low',
    icon: 'DollarSign',
    category: 'finance',
    created: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Calendar Today',
    description: '2 meetings scheduled',
    content: `## Today's Schedule

**10:00 AM** - Daily Standup (30 min)
- Team sync, moved from 9am

**2:00 PM** - 1:1 with Sarah (30 min)  
- Discuss Q1 goals
- Bring up that side project idea

### Free Blocks
- Morning until 10am ✅
- 10:30am - 2pm ✅
- After 2:30pm ✅`,
    urgency: 'medium',
    icon: 'Calendar',
    category: 'calendar',
    created: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    title: 'GitHub Activity',
    description: '2 PRs merged, 1 review request',
    content: `## GitHub Overnight Activity

### Merged PRs 🎉
- **#142** Add overnight summary feature
- **#139** Fix mobile responsive issues

### Review Requested
- **#145** by @colleague - "Refactor auth module"
  - Looks like a medium-sized PR (~200 lines)
  - They asked specifically for your review

### Action Items
- [ ] Review PR #145`,
    urgency: 'medium',
    icon: 'Github',
    category: 'work',
    created: new Date().toISOString(),
  },
];
