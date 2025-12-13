# System Architecture Documentation

This document provides a comprehensive overview of Navi's architecture, including how all components connect, the data flow between systems, and the integration with PocketBase and n8n.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Structure](#application-structure)
4. [Data Schema](#data-schema)
5. [PocketBase Integration](#pocketbase-integration)
6. [n8n Integration](#n8n-integration)
7. [Gemini Live API Integration](#gemini-live-api-integration)
8. [Context Providers](#context-providers)
9. [Hooks Architecture](#hooks-architecture)
10. [Complete Data Flow](#complete-data-flow)

---

## System Overview

**Navi** is a personal AI assistant application with three main features:

1. **Chat** - Voice/text conversation with AI, notes access, finance tools
2. **Dashboard** - Morning briefing with overnight summaries
3. **Finance** - Zero-based budgeting with offline support

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NAVI APPLICATION                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         React Frontend (Vite)                          │ │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   │ │
│  │  │    Chat    │   │  Dashboard │   │   Finance  │   │   Modals   │   │ │
│  │  └────────────┘   └────────────┘   └────────────┘   └────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          Context Providers                              │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │ │
│  │  │  Finance   │  │    Sync    │  │  Settings  │  │ FinanceTools   │  │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                              Hooks                                      │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │ │
│  │  │VoiceSession│  │GeminiLive  │  │AudioCapture│  │OvernightSummary│  │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Gemini Live    │       │    PocketBase    │       │      n8n         │
│   (Google AI)    │       │   (Database)     │       │   (Automation)   │
│                  │       │                  │       │                  │
│ - Voice AI       │       │ - Collections    │       │ - Workflows      │
│ - Function calls │       │ - Realtime       │       │ - Gmail/Cal API  │
│ - Vision         │       │ - Auth           │       │ - AI Summary     │
└──────────────────┘       └──────────────────┘       └──────────────────┘
                                    ▲                         │
                                    │                         │
                                    └─────────────────────────┘
                                       n8n writes to PocketBase
```

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Lucide Icons** | Icon library |

### Backend Services

| Service | URL | Purpose |
|---------|-----|---------|
| **PocketBase** | `https://pb.gisketch.com` | Database, Auth, Realtime |
| **n8n** | `https://automate.gisketch.com` | Workflow automation |
| **Gemini Live** | Google AI | Voice AI, Function calling |

### Local Storage

| Technology | Purpose |
|------------|---------|
| **IndexedDB** | Offline data cache |
| **LocalStorage** | Settings, API keys |

---

## Application Structure

```
src/
├── main.tsx                 # App entry point
├── index.css                # Global styles
├── vite-env.d.ts           # Vite types
│
├── components/
│   ├── App.tsx             # Root component, routing
│   ├── Navi.tsx            # AI avatar (blob)
│   ├── ChatUI.tsx          # Chat interface
│   ├── Dashboard.tsx       # Morning briefing
│   ├── Finance.tsx         # Budget tracker
│   ├── FinanceVoiceOverlay.tsx  # Finance voice mode
│   ├── BottomNavBar.tsx    # Navigation
│   ├── Sidebar.tsx         # Side navigation
│   ├── ControlBar.tsx      # Voice controls
│   ├── CameraPreview.tsx   # Camera feed
│   ├── CameraControls.tsx  # Camera UI
│   ├── ResultCards.tsx     # AI result display
│   ├── DynamicIcon.tsx     # Lucide icon wrapper
│   ├── AnimatedBackground.tsx  # Particle background
│   ├── Toast.tsx           # Notifications
│   └── modals/             # Modal components
│       ├── ModalManager.tsx
│       ├── SettingsModal.tsx
│       ├── ExpenseInputModal.tsx
│       ├── PaymentModal.tsx
│       └── ...
│
├── contexts/
│   ├── FinanceContext.tsx      # Finance data & actions
│   ├── FinanceToolsContext.tsx # AI finance tool handlers
│   ├── SyncContext.tsx         # Offline sync
│   ├── SettingsContext.tsx     # App settings
│   ├── ModalContext.tsx        # Modal management
│   └── FunctionCallLogContext.tsx  # Tool call logging
│
├── hooks/
│   ├── useVoiceSession.ts      # Combined voice interface
│   ├── useGeminiLive.ts        # Gemini API connection
│   ├── useAudioCapture.ts      # Microphone capture
│   ├── useAudioPlayback.ts     # Speaker playback
│   ├── useCamera.ts            # Camera capture
│   ├── useOvernightSummaries.ts # Dashboard data
│   ├── useFinanceData.ts       # Finance data helper
│   ├── useFinanceHandlers.ts   # Finance event handlers
│   ├── useNaviState.ts         # Navi state machine
│   ├── useLocalStorage.ts      # Persistent storage
│   └── useOnlineStatus.ts      # Network status
│
└── utils/
    ├── constants.ts            # Types, config, mock data
    ├── financeTypes.ts         # Finance types & transforms
    ├── tools.ts                # AI function definitions
    ├── pocketbase.ts           # PocketBase client
    ├── offlineCache.ts         # IndexedDB operations
    └── glass.ts                # Glassmorphism utilities
```

---

## Data Schema

### Complete Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SCHEMA                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │   money_drops   │◄──────────────────────────────────────────┐            │
│  ├─────────────────┤                                           │            │
│  │ id              │                                           │            │
│  │ name            │                                           │            │
│  │ amount          │                                           │            │
│  │ date            │      ┌─────────────────┐                  │            │
│  │ is_received     │      │   allocations   │                  │            │
│  │ type (salary/   │◄─────┤─────────────────┤                  │            │
│  │       extra)    │      │ id              │                  │            │
│  │ period_start    │      │ name            │                  │            │
│  │ period_end      │      │ type            │                  │            │
│  └─────────────────┘      │ total_budget    │                  │            │
│                           │ current_balance │                  │            │
│                           │ is_strict       │                  │            │
│                           │ money_drop_id ──┼──────────────────┘            │
│  ┌─────────────────┐      │ linked_debt_id ─┼──┐                            │
│  │     debts       │◄─────┤linked_sub_id ───┼──┼──┐                         │
│  ├─────────────────┤      └─────────────────┘  │  │                         │
│  │ id              │              ▲            │  │                         │
│  │ name            │              │            │  │                         │
│  │ total_amount    │              │            │  │                         │
│  │ remaining_amount│    ┌─────────┴─────────┐  │  │                         │
│  │ priority        │    │   transactions    │  │  │                         │
│  │ due_date        │    ├───────────────────┤  │  │                         │
│  │ notes           │◄───┤ id                │  │  │                         │
│  └─────────────────┘    │ amount            │  │  │                         │
│          ▲              │ description       │  │  │                         │
│          │              │ transaction_date  │  │  │                         │
│          │              │ allocation_id ────┼──┘  │                         │
│          │              └───────────────────┘     │                         │
│          │                                        │                         │
│          └────────────────────────────────────────┘                         │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐                               │
│  │  subscriptions  │      │ overnight_cards │                               │
│  ├─────────────────┤      ├─────────────────┤                               │
│  │ id              │      │ id              │                               │
│  │ name            │      │ title           │                               │
│  │ amount          │      │ description     │                               │
│  │ billing_day     │      │ content         │                               │
│  │ category        │      │ urgency         │                               │
│  │ is_active       │      │ icon            │                               │
│  │ end_on_date     │      │ category        │                               │
│  └─────────────────┘      │ created         │                               │
│                           └─────────────────┘                               │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐                               │
│  │ daily_summaries │      │  task_updates   │                               │
│  ├─────────────────┤      ├─────────────────┤                               │
│  │ id              │      │ id              │                               │
│  │ summary         │      │ task_id         │                               │
│  │ created         │      │ status          │                               │
│  └─────────────────┘      │ message         │                               │
│                           │ final_output    │                               │
│                           │ created         │                               │
│                           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Collection Details

| Collection | Purpose | Records |
|------------|---------|---------|
| `money_drops` | Income sources | ~2/month (salary cycles) |
| `allocations` | Budget buckets | ~5-20 per drop |
| `transactions` | Expenses | Many per cycle |
| `debts` | Debt tracking | ~0-10 active |
| `subscriptions` | Recurring bills | ~5-20 |
| `overnight_cards` | Dashboard items | ~10-50 |
| `daily_summaries` | AI summaries | 1/day |
| `task_updates` | n8n task status | Temporary |
| `budget_templates` | Allocation rules | ~1-5 |

---

## PocketBase Integration

### Client Setup

```typescript
// src/utils/pocketbase.ts
import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://pb.gisketch.com');
```

### Data Fetching Pattern

```typescript
// Fetch with auto-cancellation disabled
const records = await pb.collection('money_drops').getFullList({ 
  requestKey: null  // Prevents auto-cancellation
});

// Transform PocketBase records to app types
const moneyDrops = records.map(r => transformMoneyDrop(r));
```

### Realtime Subscriptions

```typescript
// Subscribe to collection changes
pb.collection('overnight_cards').subscribe('*', (e) => {
  console.log('Event:', e.action);  // 'create' | 'update' | 'delete'
  console.log('Record:', e.record);
  
  // Update local state
  if (e.action === 'create') {
    setCards(prev => [...prev, e.record]);
  }
});

// Cleanup
pb.collection('overnight_cards').unsubscribe();
```

### Write Operations

```typescript
// Create
const record = await pb.collection('transactions').create({
  amount: 200,
  description: 'Coffee',
  allocation_id: 'abc123',
  transaction_date: new Date().toISOString(),
});

// Update
await pb.collection('allocations').update('abc123', {
  current_balance: 7800,
});

// Delete
await pb.collection('transactions').delete('xyz789');
```

---

## n8n Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              n8n INTEGRATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     NAVI BRAIN WORKFLOW                                  ││
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              ││
│  │  │ Webhook │───▶│ Process │───▶│ Update  │───▶│ Return  │              ││
│  │  │ Trigger │    │ Request │    │ Status  │    │ Result  │              ││
│  │  └─────────┘    └─────────┘    └─────────┘    └─────────┘              ││
│  │       ▲                              │                                   ││
│  │       │                              ▼                                   ││
│  │  ┌─────────┐              ┌──────────────────┐                          ││
│  │  │  Navi   │              │   PocketBase     │                          ││
│  │  │  App    │◀─────────────│  task_updates    │                          ││
│  │  └─────────┘              └──────────────────┘                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                   OVERNIGHT SUMMARY WORKFLOW                             ││
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              ││
│  │  │Schedule │───▶│  Gmail  │───▶│OpenAI   │───▶│PocketBase│              ││
│  │  │ 6:00 AM │    │Calendar │    │Summary  │    │ Write    │              ││
│  │  └─────────┘    └─────────┘    └─────────┘    └─────────┘              ││
│  │                      │                              │                    ││
│  │                      ▼                              ▼                    ││
│  │              overnight_cards              daily_summaries                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Navi Brain Webhook

**Endpoint**: `https://automate.gisketch.com/webhook/navi-brain`

**Request**:
```json
{
  "task_id": "uuid-here",
  "instruction": "Find my grocery list"
}
```

**Workflow**:
1. Receive webhook with task_id and instruction
2. Update PocketBase `task_updates`: `{ status: 'processing', message: 'Searching...' }`
3. Query Obsidian vault / process instruction
4. Update PocketBase: `{ status: 'completed', final_output: {...} }`

**Response Format**:
```json
{
  "summary": "Found 3 notes about groceries",
  "relevant_data": [
    {
      "card_type": "notes",
      "card_title": "Grocery List",
      "card_description": "Weekly shopping items",
      "card_content": "- Milk\n- Eggs\n- Bread"
    }
  ],
  "suggested_next_step": "Would you like to add anything to the list?"
}
```

### Overnight Summary Workflow

**Schedule**: 6:00 AM daily

**Flow**:
1. Fetch unread Gmail emails
2. Fetch today's calendar events
3. Fetch pending tasks/notifications
4. Transform to overnight_cards format
5. Generate AI summary with OpenAI
6. POST to PocketBase

---

## Gemini Live API Integration

### Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GEMINI LIVE API FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐                                                               │
│   │  User   │                                                               │
│   │  Speaks │                                                               │
│   └────┬────┘                                                               │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │ useAudioCapture │───▶│ useGeminiLive   │───▶│ Gemini Live API │        │
│   │ (16kHz PCM)     │    │ (WebSocket)     │    │ (models/gemini- │        │
│   └─────────────────┘    └─────────────────┘    │  2.5-flash...)  │        │
│                                                  └────────┬────────┘        │
│                                                           │                 │
│   ┌───────────────────────────────────────────────────────┼─────────────┐  │
│   │                        RESPONSES                       ▼             │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│   │  │ inputTrans  │  │outputTrans  │  │  toolCall   │  │   audio   │  │  │
│   │  │ cription    │  │cription     │  │             │  │   data    │  │  │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │  │
│   │         │                │                │                │        │  │
│   │         ▼                ▼                ▼                ▼        │  │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────────┐  ┌──────────┐  │  │
│   │   │currentTurn│   │currentTurn│   │handleToolCall│  │queueAudio│  │  │
│   │   │(user text)│   │(AI text)  │   │              │  │(playback)│  │  │
│   │   └──────────┘    └──────────┘    └──────────────┘  └──────────┘  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐
│   │                        TOOL HANDLING                                    │
│   │  ┌───────────────────┐    ┌───────────────────┐                        │
│   │  │ BASE TOOLS        │    │ FINANCE TOOLS     │                        │
│   │  │ - digital_brain   │    │ - log_expense     │                        │
│   │  │ - openObsidian    │    │ - pay_bill        │                        │
│   │  │                   │    │ - search_debts    │                        │
│   │  │ → n8n webhook     │    │ → FinanceTools    │                        │
│   │  │ → PocketBase sub  │    │   Context         │                        │
│   │  └───────────────────┘    └───────────────────┘                        │
│   └─────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Configuration

```typescript
const config = {
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Kore',  // Or other voice
      },
    },
  },
  inputAudioTranscription: {},   // Enable input transcription
  outputAudioTranscription: {},  // Enable output transcription
  tools: TOOLS,                   // Function definitions
  systemInstruction: { 
    parts: [{ text: systemPrompt }] 
  },
};
```

### Function Calling Flow

```
1. User: "Log 200 for coffee"
   
2. Gemini recognizes intent → calls log_expense tool
   
3. useGeminiLive receives toolCall:
   {
     functionCalls: [{
       id: 'call_123',
       name: 'log_expense',
       args: { amount: 200, description: 'coffee' }
     }]
   }
   
4. Check if finance tool → delegate to onExternalToolCall
   
5. FinanceToolsContext.executeFinanceTool()
   - Prepares action with resolved allocation
   - Shows confirmation modal
   - User confirms
   
6. Send tool response:
   session.sendToolResponse({
     functionResponses: [{
       id: 'call_123',
       name: 'log_expense',
       response: { result: 'Logged ₱200 for coffee...' }
     }]
   });
   
7. Gemini continues with verbal confirmation
```

---

## Context Providers

### Provider Tree

```tsx
// App.tsx (simplified)
<SettingsProvider>
  <FunctionCallLogProvider>
    <ModalProvider>
      <FinanceProvider>
        <SyncProvider onSyncComplete={finance.refetch}>
          <FinanceToolsProvider>
            {/* Application */}
          </FinanceToolsProvider>
        </SyncProvider>
      </FinanceProvider>
    </ModalProvider>
  </FunctionCallLogProvider>
</SettingsProvider>
```

### Context Responsibilities

| Context | State | Actions |
|---------|-------|---------|
| `SettingsContext` | API key, voice, webhooks | Update settings |
| `FinanceContext` | All finance data | CRUD operations |
| `FinanceToolsContext` | Pending tool action | Execute/confirm/cancel |
| `SyncContext` | Online status, pending ops | Trigger sync |
| `ModalContext` | Active modal | Open/close modals |
| `FunctionCallLogContext` | Tool call history | Add/clear logs |

---

## Hooks Architecture

### Composition Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOOKS COMPOSITION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        useVoiceSession                               │   │
│   │  Combines:                                                           │   │
│   │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │   │
│   │  │ useGeminiLive   │ │ useAudioCapture │ │ useAudioPlayback│       │   │
│   │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │   │
│   │                                                                      │   │
│   │  Returns: {                                                          │   │
│   │    connectionStatus, isConnected,                                    │   │
│   │    isCapturing, isPlaying, audioLevel,                               │   │
│   │    messages, currentTurn, liveStatus,                                │   │
│   │    connect, disconnect, sendText, sendVideo, ...                     │   │
│   │  }                                                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│   │ useNaviState    │ │ useCamera       │ │ useLocalStorage │              │
│   │ (Navi animation)│ │ (Video capture) │ │ (Persist state) │              │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    useOvernightSummaries                             │   │
│   │  - Fetches dashboard data                                            │   │
│   │  - Manages cache fallback                                            │   │
│   │  - Subscribes to realtime                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     useFinanceData / useFinanceHandlers              │   │
│   │  - Wrapper hooks for FinanceContext                                  │   │
│   │  - Event handlers for finance UI                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Data Flow

### Chat Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHAT MESSAGE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User speaks into microphone                                             │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  useAudioCapture                                                     │   │
│  │  - navigator.mediaDevices.getUserMedia()                            │   │
│  │  - AudioWorklet processes at 16kHz                                   │   │
│  │  - Outputs base64-encoded PCM chunks                                 │   │
│  └────────────────────────────────────────────────────────────────┬────┘   │
│                                                                    │        │
│     ▼                                                              │        │
│  ┌─────────────────────────────────────────────────────────────────┴───┐   │
│  │  useGeminiLive.sendAudio(base64Chunk)                               │   │
│  │  - Sends to WebSocket session                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. Gemini processes and responds                                           │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Response contains:                                                  │   │
│  │  - serverContent.inputTranscription  → Update currentTurn (user)    │   │
│  │  - serverContent.outputTranscription → Update currentTurn (AI)      │   │
│  │  - data (audio)                      → Queue for playback           │   │
│  │  - toolCall                          → Handle function call         │   │
│  │  - serverContent.turnComplete        → Move to messages array       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. Tool call handling (if any)                                             │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Base Tools (digital_brain):                                         │   │
│  │  1. Subscribe to task_updates                                        │   │
│  │  2. POST to n8n webhook                                              │   │
│  │  3. Wait for PocketBase update                                       │   │
│  │  4. Send tool response                                               │   │
│  │                                                                       │   │
│  │  Finance Tools:                                                       │   │
│  │  1. Delegate to FinanceToolsContext                                  │   │
│  │  2. Show confirmation modal (if write)                               │   │
│  │  3. Execute action on confirm                                         │   │
│  │  4. Send tool response                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  4. Audio playback                                                          │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  useAudioPlayback                                                    │   │
│  │  - Decodes base64 to AudioBuffer                                     │   │
│  │  - Plays through AudioContext                                         │   │
│  │  - Queues multiple chunks for smooth playback                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Finance Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FINANCE TRANSACTION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: "Log 200 for coffee"                                                 │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Gemini calls: log_expense({ amount: 200, description: 'coffee' })  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  useGeminiLive.handleToolCall()                                      │   │
│  │  → onExternalToolCall('log_expense', args, toolCallId)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FinanceToolsContext.executeFinanceTool()                            │   │
│  │  1. Resolve allocation (default: Living wallet)                      │   │
│  │  2. Create pendingAction                                             │   │
│  │  3. Return { needsConfirmation: true }                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FinanceConfirmationModal appears                                    │   │
│  │  "Log ₱200 for 'coffee' from Living wallet"                         │   │
│  │  [Cancel] [Confirm]                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼ (User confirms)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FinanceToolsContext.confirmPendingAction()                          │   │
│  │  1. FinanceContext.createTransaction()                               │   │
│  │     - Optimistic update (local state)                                │   │
│  │     - Try PocketBase create                                          │   │
│  │     - Queue for sync if offline                                      │   │
│  │  2. Update allocation balance                                         │   │
│  │  3. Return result string                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  sendToolResponse(toolCallId, 'log_expense', result)                 │   │
│  │  → Gemini continues with verbal confirmation                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│     │                                                                        │
│     ▼                                                                        │
│  Navi: "Done! I've logged 200 pesos for coffee. Your Living wallet         │
│         now has 3,500 pesos remaining."                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SCHEDULED (6 AM)                                                    │   │
│  │                                                                       │   │
│  │  n8n Workflow triggers                                               │   │
│  │     │                                                                 │   │
│  │     ├── Fetch Gmail (unread emails)                                  │   │
│  │     ├── Fetch Google Calendar (today's events)                       │   │
│  │     ├── Fetch GitHub (notifications, PRs)                            │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  Transform to overnight_cards format                                  │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  Generate AI summary (OpenAI)                                         │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  POST to PocketBase                                                   │   │
│  │     ├── overnight_cards (multiple)                                    │   │
│  │     └── daily_summaries (one)                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  USER OPENS APP                                                       │   │
│  │                                                                       │   │
│  │  Dashboard.tsx renders                                               │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  useOvernightSummaries()                                              │   │
│  │     │                                                                 │   │
│  │     ├── Try: pb.collection('overnight_cards').getList()              │   │
│  │     │   └── Success: Update state, save cache                         │   │
│  │     │                                                                 │   │
│  │     └── Fail: Try cache → Try mock data                              │   │
│  │                                                                       │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  Subscribe to realtime                                               │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  Render:                                                              │   │
│  │     ├── Greeting ("Good morning, Ghegi")                             │   │
│  │     ├── SpeechBubble ("While you slept...")                          │   │
│  │     └── OvernightCards (sorted by urgency)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REALTIME UPDATE (new n8n workflow run)                              │   │
│  │                                                                       │   │
│  │  PocketBase emits: { action: 'create', record: {...} }               │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  Subscription callback                                                │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  setCards(prev => [...prev, newCard])                                │   │
│  │     │                                                                 │   │
│  │     ▼                                                                 │   │
│  │  UI updates automatically                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Chat UI](./CHAT_UI.md) | Chat interface details |
| [Dashboard](./DASHBOARD.md) | Dashboard feature details |
| [Finance](./FINANCE.md) | Finance system details |
| [Offline Sync](./OFFLINE_SYNC.md) | Offline mechanism details |
| [PocketBase Setup](../POCKETBASE_N8N_SETUP.md) | Backend setup guide |
