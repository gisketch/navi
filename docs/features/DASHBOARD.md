# Dashboard Documentation

The Dashboard is the home screen of **Navi**, providing a personalized morning briefing with AI-generated summaries and actionable cards from various data sources like email, calendar, and more.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Fetching Strategy](#data-fetching-strategy)
4. [Offline Support & Caching](#offline-support--caching)
5. [Component Structure](#component-structure)
6. [Data Types](#data-types)
7. [Animation System](#animation-system)
8. [Real-time Updates](#real-time-updates)
9. [Configuration](#configuration)

---

## Overview

The Dashboard displays:

- **Personalized Greeting** - "Good morning, Ghegi" based on time of day
- **AI Daily Summary** - "While you slept..." briefing from n8n workflows
- **Overnight Cards** - Actionable items sorted by urgency (emails, tasks, reminders)
- **Card Detail Modals** - Expandable cards with full markdown content

### Key Features

| Feature | Description |
|---------|-------------|
| Offline-First | Uses IndexedDB cache when network unavailable |
| Real-time Updates | PocketBase subscriptions for live data |
| Urgency Sorting | Cards sorted: urgent → high → medium → low |
| Glassmorphism UI | Frosted glass aesthetic with proximity glow |
| Staggered Animations | Beautiful entrance animations on load |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard.tsx                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Header (Greeting)                                            ││
│  │ "Good morning, Ghegi"                                        ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ SpeechBubble                                                 ││
│  │ "While you slept..." (AI Summary)                            ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ OvernightCardItem[] (Scrollable)                             ││
│  │ [Email] [Calendar] [Tasks] [Finance]                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            useOvernightSummaries Hook                     │   │
│  │  ┌────────────────┐   ┌────────────────┐                 │   │
│  │  │ fetchCards()   │   │  Subscribe()   │                 │   │
│  │  │ (Initial Load) │   │ (Real-time)    │                 │   │
│  │  └────────┬───────┘   └────────────────┘                 │   │
│  │           │                                               │   │
│  │           ▼                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │              Cache Strategy                          │ │   │
│  │  │  1. Try PocketBase (network)                        │ │   │
│  │  │  2. Fallback to IndexedDB cache                     │ │   │
│  │  │  3. Last resort: Mock data                          │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      PocketBase                             │ │
│  │   ┌─────────────────┐    ┌─────────────────┐               │ │
│  │   │ overnight_cards │    │ daily_summaries │               │ │
│  │   └─────────────────┘    └─────────────────┘               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Fetching Strategy

### Hook: `useOvernightSummaries`

Located in `src/hooks/useOvernightSummaries.ts`

```typescript
interface UseOvernightSummariesReturn {
  cards: OvernightCard[];           // Sorted by urgency
  dailySummary: DailySummary | null; // AI-generated summary
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;       // ISO timestamp
  isMock: boolean;                  // Using mock data?
  refetch: () => Promise<void>;     // Manual refresh
}
```

### Fetch Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      fetchCards()                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  USE_MOCK_DATA = true?                                          │
│  ├── YES: Return MOCK_OVERNIGHT_CARDS + MOCK_DAILY_SUMMARY      │
│  └── NO:  Continue to network fetch                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Try: PocketBase API                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pb.collection('overnight_cards').getList(1, 50, {      │   │
│  │    sort: '-created',                                     │   │
│  │    requestKey: null  // Disable auto-cancellation        │   │
│  │  })                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pb.collection('daily_summaries').getList(1, 1, {       │   │
│  │    sort: '-created'                                      │   │
│  │  })                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
           SUCCESS          ERROR          
              │               │               
              ▼               ▼               
┌─────────────────┐  ┌─────────────────────────────────────┐
│ Sort by urgency │  │ Try IndexedDB cache                 │
│ Save to cache   │  │ ┌─────────────────────────────────┐ │
│ Return data     │  │ │ getDashboardCache()             │ │
└─────────────────┘  │ └─────────────────────────────────┘ │
                     │           │                         │
                     │   ┌───────┼───────┐                 │
                     │ FOUND    NOT FOUND                  │
                     │   │           │                     │
                     │   ▼           ▼                     │
                     │ Use cache   Use mock data           │
                     └─────────────────────────────────────┘
```

### Urgency Sorting

```typescript
const urgencyOrder: Record<UrgencyLevel, number> = {
  urgent: 0,  // Highest priority
  high: 1,
  medium: 2,
  low: 3,     // Lowest priority
};

const sortByUrgency = (cards: OvernightCard[]) => {
  return [...cards].sort((a, b) => 
    urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
};
```

---

## Offline Support & Caching

### Cache Strategy

The Dashboard implements an offline-first approach:

1. **Primary**: Fetch from PocketBase API
2. **Fallback**: Load from IndexedDB cache
3. **Last Resort**: Display mock data with indicator

### Cache Storage

Uses `offlineCache.ts` with IndexedDB:

```typescript
// Save dashboard data
await saveDashboardCache({
  overnightCards: sortedCards,
  dailySummary: summary,
});

// Retrieve cached data
const cached = await getDashboardCache();
// Returns: { overnightCards: [], dailySummary: {} } | null
```

### IndexedDB Structure

```
Database: navi_offline_cache
├── Stores:
│   ├── dashboard_cache     ← Dashboard data
│   ├── finance_cache       ← Finance data
│   ├── pending_operations  ← Offline writes
│   └── cache_metadata      ← Sync timestamps
```

### Cache Interface

```typescript
interface DashboardCache {
  overnightCards: OvernightCard[];
  dailySummary: DailySummary | null;
}
```

### Offline Detection

```typescript
try {
  // Network fetch
  const cards = await pb.collection('overnight_cards').getFullList();
  // Success - save to cache
  await saveDashboardCache({ overnightCards: cards, ... });
} catch (err) {
  // Network error - load from cache
  const cached = await getDashboardCache();
  if (cached && cached.overnightCards.length > 0) {
    setCards(cached.overnightCards);
    setError('Using cached data (offline)');
  } else {
    // No cache - use mock data
    setCards(MOCK_OVERNIGHT_CARDS);
    setIsMock(true);
  }
}
```

---

## Component Structure

### Main Component: `Dashboard.tsx`

```typescript
interface DashboardProps {
  cards: OvernightCard[];
  dailySummary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isMock: boolean;
  onRefresh: () => void;
  naviPosition?: { x: number; y: number };  // For proximity glow
}
```

### Sub-Components

| Component | Description |
|-----------|-------------|
| `AnimatedWord` | Word-by-word entrance animation for greeting |
| `SpeechBubble` | AI summary with glassmorphism + word animation |
| `OvernightCardItem` | Individual card with urgency indicator |
| `GlassContainer` | Reusable glassmorphism container with glow |
| `OvernightCardModal` | Full-screen modal for card details |

### GlassContainer

Reusable component with proximity glow:

```typescript
interface GlassContainerProps {
  children: React.ReactNode;
  naviPosition?: { x: number; y: number };
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
  glowColor?: string;           // Default: 'rgba(34, 211, 238, 0.5)'
  maxGlowDistance?: number;     // Default: 300
}
```

---

## Data Types

### OvernightCard

```typescript
interface OvernightCard {
  id: string;
  title: string;           // "Email from John"
  description: string;     // "RE: Project Update"
  content: string;         // Full markdown content
  urgency: UrgencyLevel;   // 'urgent' | 'high' | 'medium' | 'low'
  icon: string;            // Lucide icon name (e.g., 'Mail')
  category: string;        // 'email', 'calendar', 'task', etc.
  created: string;         // ISO timestamp
}
```

### DailySummary

```typescript
interface DailySummary {
  id: string;
  summary: string;   // AI-generated text
  created: string;   // ISO timestamp
}
```

### UrgencyLevel Colors

```typescript
const urgencyColors: Record<UrgencyLevel, { accent: string; glow: string }> = {
  urgent: { 
    accent: 'rgb(248, 113, 113)',    // Red
    glow: 'rgba(248, 113, 113, 0.4)' 
  },
  high: { 
    accent: 'rgb(251, 191, 36)',     // Amber
    glow: 'rgba(251, 191, 36, 0.4)' 
  },
  medium: { 
    accent: 'rgb(52, 211, 153)',     // Emerald
    glow: 'rgba(52, 211, 153, 0.4)' 
  },
  low: { 
    accent: 'rgb(34, 211, 238)',     // Cyan
    glow: 'rgba(34, 211, 238, 0.4)' 
  },
};
```

---

## Animation System

### Staggered Entrance Delays

```typescript
const greetingDelay = 0.1;
const speechBubbleDelay = greetingDelay + greetingWords.length * 0.08 + 0.3;
const cardsDelay = speechBubbleDelay + 0.8;
```

### Greeting Animation

Each word animates separately:

```typescript
function AnimatedWord({ word, index, delay }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: delay + index * 0.08,  // 80ms between words
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      {word}
    </motion.span>
  );
}
```

### SpeechBubble Word Animation

```typescript
// Words appear one by one after bubble animates in
{showWords && words.map((word, i) => (
  <motion.span
    key={i}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: i * 0.03,  // 30ms between words
      duration: 0.3,
    }}
  >
    {word}
  </motion.span>
))}
```

### Card Entrance

```typescript
<motion.div
  initial={{ opacity: 0, y: 30, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{
    delay: entranceDelay + index * 0.1,  // 100ms stagger
    duration: 0.5,
    ease: [0.2, 0.8, 0.2, 1],
  }}
>
```

---

## Real-time Updates

### PocketBase Subscriptions

The hook subscribes to real-time changes:

```typescript
useEffect(() => {
  fetchCards(); // Initial load

  // Subscribe to overnight_cards changes
  pb.collection('overnight_cards').subscribe('*', (e) => {
    if (e.action === 'create') {
      setCards(prev => sortByUrgency([...prev, e.record]));
    } else if (e.action === 'update') {
      setCards(prev => sortByUrgency(
        prev.map(card => card.id === e.record.id ? e.record : card)
      ));
    } else if (e.action === 'delete') {
      setCards(prev => prev.filter(card => card.id !== e.record.id));
    }
    setLastUpdated(new Date().toISOString());
  });

  // Subscribe to daily_summaries changes
  pb.collection('daily_summaries').subscribe('*', (e) => {
    if (e.action === 'create' || e.action === 'update') {
      setDailySummary(e.record);
    }
    setLastUpdated(new Date().toISOString());
  });

  // Cleanup
  return () => {
    pb.collection('overnight_cards').unsubscribe();
    pb.collection('daily_summaries').unsubscribe();
  };
}, []);
```

### Update Flow

```
n8n Workflow (Scheduled)
        │
        ▼
┌─────────────────────┐
│  Process Data       │
│  (Email, Calendar)  │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  POST to PocketBase │
│  overnight_cards    │
│  daily_summaries    │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  PocketBase         │
│  Realtime Event     │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Dashboard Updates  │
│  (Subscription)     │
└─────────────────────┘
```

---

## Configuration

### Mock Data Toggle

In `useOvernightSummaries.ts`:

```typescript
// ⚠️ SET TO FALSE WHEN POCKETBASE IS CONFIGURED
const USE_MOCK_DATA = false;
```

### PocketBase Collections

Required collections in PocketBase:

```typescript
export const POCKETBASE_COLLECTIONS = {
  OVERNIGHT_CARDS: 'overnight_cards',
  DAILY_SUMMARIES: 'daily_summaries',
};
```

### Time-based Greeting

```typescript
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
```

### Last Updated Format

```typescript
function formatLastUpdated(isoString: string | null): string {
  if (!isoString) return '';
  const diffMins = Math.floor((now - date) / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/components/Dashboard.tsx` | Main dashboard component |
| `src/hooks/useOvernightSummaries.ts` | Data fetching hook |
| `src/utils/offlineCache.ts` | IndexedDB cache operations |
| `src/utils/pocketbase.ts` | PocketBase client |
| `src/utils/constants.ts` | Types and mock data |
| `src/utils/glass.ts` | Glassmorphism utilities |
| `src/components/OvernightCardModal.tsx` | Card detail modal |
| `docs/POCKETBASE_N8N_SETUP.md` | Backend setup guide |

---

## Example Data Flow

### Morning Briefing

```
6:00 AM - n8n Workflow Triggers
    │
    ▼
┌─────────────────────────────────────────┐
│  Fetch overnight data:                  │
│  - Gmail: 3 unread emails               │
│  - Google Calendar: 2 meetings today    │
│  - GitHub: 1 PR merged                  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  AI Summary Generation (OpenAI)         │
│  "You have 3 emails, 1 needs response.  │
│   Two meetings today. PR #142 merged."  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  POST to PocketBase                     │
│  - overnight_cards (3 cards)            │
│  - daily_summaries (1 summary)          │
└─────────────────────────────────────────┘
    │
    ▼
7:30 AM - User Opens Navi
    │
    ▼
┌─────────────────────────────────────────┐
│  Dashboard Loads                        │
│  "Good morning, Ghegi"                  │
│  "While you slept..."                   │
│  [Email][Calendar][GitHub] cards        │
└─────────────────────────────────────────┘
```

### User Opens Card

```
User taps [Email] card
    │
    ▼
┌─────────────────────────────────────────┐
│  OvernightCardModal opens               │
│  Shows full markdown content:           │
│  - Email from Manager                   │
│  - Action items                         │
│  - Reply suggestions                    │
└─────────────────────────────────────────┘
```

---

## Best Practices

### Performance

1. **Request Key**: Use `requestKey: null` to prevent auto-cancellation
2. **Limit Queries**: Fetch max 50 cards at a time
3. **Debounce Cache**: Save cache changes with debouncing

### Offline UX

1. Show "Demo Mode" badge when using mock data
2. Show "Using cached data (offline)" message when offline
3. Auto-refresh when coming back online

### Animations

1. Use staggered delays for natural feel
2. Keep animations under 500ms
3. Use spring physics for organic movement
