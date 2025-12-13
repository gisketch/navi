# Chat UI Documentation

The Chat UI is the primary conversational interface for **Navi**, an AI-powered personal assistant. It provides a real-time voice and text interaction system powered by Google's Gemini Live API with function calling capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [Function Tools](#function-tools)
5. [Voice Integration](#voice-integration)
6. [Camera & AR Mode](#camera--ar-mode)
7. [UI Features](#ui-features)
8. [Data Flow](#data-flow)

---

## Overview

The Chat UI (`ChatUI.tsx`) serves as the main conversational interface where users can:

- **Voice chat** with Navi using real-time audio streaming
- **Text chat** for manual input
- **Use function tools** to access notes, manage finances, and more
- **View result cards** displaying data from tool executions
- **Enable camera mode** for visual AI assistance (AR-style)

### Key Features

| Feature | Description |
|---------|-------------|
| Real-time Transcription | Live display of user and assistant speech |
| Function Calling | 12+ integrated tools for productivity |
| Visual Feedback | Proximity-based glow effects synced with Navi state |
| Camera Integration | Send video frames to Gemini for visual analysis |
| Result Cards | Display notes, search results, and data visually |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ChatUI.tsx                             │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │   │
│  │  │   ChatBubble   │  │  StatusBubble  │  │ ResultCards │ │   │
│  │  └────────────────┘  └────────────────┘  └─────────────┘ │   │
│  │  ┌────────────────┐  ┌────────────────┐                  │   │
│  │  │ CameraPreview  │  │ CameraControls │                  │   │
│  │  └────────────────┘  └────────────────┘                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               useVoiceSession Hook                        │   │
│  │  ┌─────────────────┐ ┌──────────────┐ ┌───────────────┐  │   │
│  │  │ useGeminiLive   │ │useAudioCapture│ │useAudioPlayback│ │   │
│  │  └─────────────────┘ └──────────────┘ └───────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │   Gemini Live API   │  │         PocketBase              │   │
│  │  (Audio Streaming)  │  │  (Notes, Task Updates)          │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Structure

### Main Component: `ChatUI.tsx`

```typescript
interface ChatUIProps {
  messages: ChatMessage[];                    // Chat history
  currentTurn: { role; text; id } | null;     // Live transcription
  isCapturing: boolean;                       // Mic active
  activeCards?: CardData[];                   // Result cards to display
  onDismissCards?: () => void;                // Dismiss cards
  naviPosition?: { x; y };                    // Navi's position for glow
  naviState?: NaviState;                      // Current Navi state
  liveStatus?: string | null;                 // Tool processing status
  isCameraActive: boolean;                    // Camera on/off
  onCameraFrame?: (base64Image: string) => void;  // Video frame handler
  isChatVisible?: boolean;                    // AR mode toggle
  onToggleChatVisible?: () => void;
}
```

### Sub-Components

| Component | Purpose |
|-----------|---------|
| `ChatBubble` | Renders individual chat messages with glassmorphism styling |
| `StatusBubble` | Shows Navi's current processing status (e.g., "Searching notes...") |
| `ListeningIndicator` | Animated indicator when mic is active |
| `ResultCards` | Displays data cards from tool executions |
| `CameraPreview` | Full-screen camera feed for AR mode |
| `CameraControls` | Toggle chat visibility, flip camera |

---

## Function Tools

The Chat UI integrates with two categories of function tools defined in `src/utils/tools.ts`:

### Base Tools (Notes & Obsidian)

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `access_digital_brain` | **Master Tool** - Queries user's Obsidian notes via n8n webhook | `instruction`, `processingText` |
| `openObsidianNote` | Opens a specific note in Obsidian app | `filename` |

#### How `access_digital_brain` Works

```
1. User: "What's on my grocery list?"
   
2. Navi says: "Checking your notes..."
   
3. Tool Call: access_digital_brain({
     instruction: "Find grocery list",
     processingText: "Consulting the brain..."
   })
   
4. Flow:
   a) Generate unique task_id
   b) Subscribe to PocketBase 'task_updates' collection
   c) POST to n8n webhook with task_id + instruction
   d) n8n processes request, updates PocketBase
   e) Navi receives update, shows results as cards
```

### Finance Tools

| Tool Name | Type | Description |
|-----------|------|-------------|
| `financial_forecast` | Read | Get budget status, daily safe spend, days remaining |
| `search_bills` | Read | Search subscriptions/recurring bills |
| `search_debts` | Read | Search debts by name/priority |
| `search_allocations` | Read | Search budget allocations/wallets |
| `get_transaction_logs` | Read | Get recent expense history |
| `log_expense` | Write | Log a new expense (shows confirmation modal) |
| `add_bill` | Write | Add new recurring bill |
| `add_debt` | Write | Add new debt to track |
| `pay_bill` | Write | Pay a bill (with fuzzy search) |
| `pay_debt` | Write | Make debt payment |

#### Finance Tool Behavior

**Read-only tools** execute immediately and return results.

**Write tools** follow a confirmation flow:
1. Tool is called with parameters
2. `FinanceToolsContext` prepares the action
3. Confirmation modal appears
4. User confirms/cancels
5. Result sent back to Gemini

#### Smart Defaults

The system uses intelligent defaults to minimize questions:

```typescript
// User says: "I spent 200 on lunch"
// Navi immediately calls:
log_expense({
  amount: 200,
  description: "lunch",
  allocation_name: "Living"  // Auto-defaults to Living wallet
})
// Modal appears for confirmation
```

#### Fuzzy Search for Payments

```typescript
// User says: "Pay the G loan"
pay_bill({
  bill_name: "G Loan",
  search_terms: ["G Loan", "GLoan", "G-Loan", "GCash Loan", "loan"]
})
```

---

## Voice Integration

### Hook: `useVoiceSession`

Combines three hooks into a unified voice interface:

```typescript
const {
  // Connection
  connectionStatus,    // 'disconnected' | 'connecting' | 'connected' | 'error'
  connect,
  disconnect,
  
  // Audio
  isCapturing,         // Microphone active
  isPlaying,           // Audio playback active
  audioLevel,          // Current mic level (0-1)
  startCapture,
  stopCapture,
  
  // Chat
  messages,            // Chat history
  currentTurn,         // Live transcription
  liveStatus,          // Tool status text
  activeCards,         // Result cards
  
  // Actions
  sendText,            // Send text message
  sendVideo,           // Send camera frame
  sendToolResponse,    // Respond to pending tool
} = useVoiceSession(options);
```

### Audio Flow

```
┌───────────┐     ┌─────────────────┐     ┌──────────────┐
│   User    │────▶│ useAudioCapture │────▶│ Gemini Live  │
│ Microphone│     │ (16kHz PCM)     │     │    API       │
└───────────┘     └─────────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌───────────┐     ┌──────────────────┐    ┌──────────────┐
│  Speaker  │◀────│ useAudioPlayback │◀───│  Response    │
│           │     │ (24kHz Audio)    │    │  (Audio+Text)│
└───────────┘     └──────────────────┘    └──────────────┘
```

### Hook: `useGeminiLive`

Core connection to Gemini Live API:

```typescript
const gemini = useGeminiLive({
  apiKey: string,
  systemInstruction: string,
  voiceName: string,              // e.g., 'Kore', 'Aoede'
  naviBrainWebhook: string,       // n8n webhook URL
  receiveNoteContent: boolean,    // Include note content in context
  onExternalToolCall: handler,    // Finance tool delegation
  financeMode: boolean,           // Use finance-only tools
});
```

---

## Camera & AR Mode

### How It Works

1. **User activates camera** via BottomNavBar
2. `CameraPreview` shows full-screen camera feed
3. `useCamera` hook captures frames at 1 FPS
4. Frames sent to Gemini via `sendVideo(base64Image, 'image/jpeg')`
5. Gemini can describe what it sees

### Camera Hook

```typescript
const camera = useCamera({
  initialFacing: 'environment',  // Back camera
  width: 640,
  height: 480,
  fps: 1,                        // Token efficiency
  quality: 0.7,
  onFrame: (base64Image) => {
    gemini.sendVideo(base64Image);
  }
});
```

### AR Mode

When camera is active:
- Chat bubbles can be hidden via `isChatVisible` toggle
- Navi repositions to corner (handled by `App.tsx`)
- Camera takes full screen with controls overlay

---

## UI Features

### Glassmorphism Design

All bubbles use glassmorphism styling:
- Backdrop blur (`backdrop-blur-xl`)
- Semi-transparent backgrounds
- Subtle borders

### Proximity Glow

Bubbles glow based on distance to Navi:

```typescript
const glow = calculateProximityGlow(
  bubbleRect,           // Bubble position
  naviPosition,         // Navi's center
  GLOW_MAX_DISTANCE     // 700px
);

// Returns: { intensity: 0-1, position: { x, y } }
```

### State-Based Colors

Colors sync with Navi's state:

| State | Primary Color | Usage |
|-------|--------------|-------|
| `offline` | White | Disconnected |
| `idle` | Cyan | Ready |
| `listening` | Yellow | Mic active |
| `thinking` | Green | Processing |
| `speaking` | Cyan | Audio output |

### Drag-to-Scroll

Chat uses custom drag-to-scroll with elastic bounds:

```typescript
const handleDrag = (e, info) => {
  let newY = currentY + info.delta.y;
  
  // Elastic resistance at boundaries
  if (newY > 0) {
    newY = newY * 0.3;  // 70% resistance
  }
  
  rawY.set(newY);
};
```

---

## Data Flow

### Message Flow

```
1. User speaks
   │
   ▼
2. useAudioCapture sends audio chunks to Gemini
   │
   ▼
3. Gemini returns:
   ├── inputTranscription (user's words)
   ├── outputTranscription (Navi's words)  
   ├── toolCall (function to execute)
   └── audio (Navi's voice)
   │
   ▼
4. UI updates:
   ├── currentTurn updates live
   ├── messages array on turn complete
   ├── liveStatus during tool execution
   └── activeCards with tool results
```

### Tool Execution Flow

```
┌──────────────┐
│  Gemini      │
│  Tool Call   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│               useGeminiLive                       │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │  Base Tools        │  │  Finance Tools     │  │
│  │  (handled here)    │  │  (delegated)       │  │
│  └──────────┬─────────┘  └──────────┬─────────┘  │
└─────────────┼────────────────────────┼───────────┘
              │                        │
              ▼                        ▼
┌─────────────────────┐    ┌─────────────────────┐
│  n8n Webhook +      │    │  FinanceToolsContext│
│  PocketBase Updates │    │  + Confirmation     │
└─────────────────────┘    └─────────────────────┘
              │                        │
              ▼                        ▼
┌─────────────────────────────────────────────────┐
│               Tool Response                      │
│   { result: "..." } sent back to Gemini         │
└─────────────────────────────────────────────────┘
```

---

## Configuration

### Storage Keys

```typescript
// src/utils/constants.ts
STORAGE_KEYS = {
  API_KEY: 'navi_gemini_api_key',
  SYSTEM_INSTRUCTION: 'navi_system_instruction',
  MIC_MODE: 'navi_mic_mode',           // 'manual' | 'auto'
  NAVI_BRAIN_WEBHOOK: 'navi_brain_webhook',
  VOICE_NAME: 'navi_voice_name',
  RECEIVE_NOTE_CONTENT: 'navi_receive_note_content',
}
```

### Voice Options

13 available voices from Gemini:
- Achird (Youthful)
- Algenib (Warm)
- Aoede (Clear)
- Kore (Energetic) - Default
- Zephyr (Energetic)
- ... and more

---

## Related Files

| File | Purpose |
|------|---------|
| `src/components/ChatUI.tsx` | Main chat interface component |
| `src/hooks/useVoiceSession.ts` | Combined voice session hook |
| `src/hooks/useGeminiLive.ts` | Gemini Live API connection |
| `src/hooks/useAudioCapture.ts` | Microphone capture |
| `src/hooks/useAudioPlayback.ts` | Audio playback queue |
| `src/hooks/useCamera.ts` | Camera capture |
| `src/utils/tools.ts` | Function tool definitions |
| `src/contexts/FinanceToolsContext.tsx` | Finance tool handlers |
| `src/components/ResultCards.tsx` | Display tool results |

---

## Example Usage

### Accessing Notes

```
User: "What meetings do I have today?"

Navi: "Let me check your calendar notes..."
[Status: "Consulting the brain..."]

[Result Card appears showing calendar entries]

Navi: "You have two meetings today - a standup at 10am 
       and a 1:1 with Sarah at 2pm."
```

### Logging Expenses

```
User: "I spent 200 on coffee"

Navi: "Logging 200 pesos for coffee..."
[Confirmation Modal: "Log ₱200 for 'coffee' from Living wallet"]

User: [Confirms]

Navi: "Done! Logged 200 pesos for coffee. Your Living wallet 
       now has 3,500 pesos remaining."
```

### Visual Analysis (Camera Mode)

```
User: [Camera active, pointing at document]
      "What does this say?"

Navi: "I can see a receipt from... [describes content]"
```
