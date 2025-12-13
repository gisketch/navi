# PocketBase & n8n Setup Guide for Navi

This guide explains how to set up PocketBase collections and n8n workflows to enable real data fetching for Navi's overnight summaries feature.

## Overview

Navi fetches two types of data from PocketBase:
1. **Overnight Cards** - Individual actionable items/notifications (emails, tasks, reminders)
2. **Daily Summaries** - AI-generated summary of all overnight activity

The data flow is:
```
Email/Calendar/etc → n8n Workflow → PocketBase → Navi App
```

---

## Part 1: PocketBase Setup

### Base URL
The app is configured to use: `https://pb.gisketch.com`

To change this, edit `src/utils/pocketbase.ts`:
```typescript
const pb = new PocketBase('https://your-pocketbase-url.com');
```

### Collection 1: `overnight_cards`

Create a new collection named **`overnight_cards`** with the following schema:

| Field Name    | Type      | Required | Options/Notes                                    |
|---------------|-----------|----------|--------------------------------------------------|
| `title`       | Text      | ✅ Yes   | Short title for the card (e.g., "Email from John") |
| `description` | Text      | ✅ Yes   | Brief description/preview                         |
| `content`     | Text      | ✅ Yes   | Full content or details (supports markdown)       |
| `urgency`     | Select    | ✅ Yes   | Options: `low`, `medium`, `high`                 |
| `icon`        | Text      | ✅ Yes   | Lucide icon name (see Icon Reference below)       |
| `category`    | Text      | ✅ Yes   | Category label (e.g., "Email", "Calendar", "Task") |

#### Example Record:
```json
{
  "title": "Meeting with Design Team",
  "description": "Scheduled for 2:00 PM today",
  "content": "Discuss Q3 roadmap and new feature proposals. Attendees: Sarah, Mike, Lisa. Location: Conference Room B.",
  "urgency": "medium",
  "icon": "Calendar",
  "category": "Calendar"
}
```

### Collection 2: `daily_summaries`

Create a new collection named **`daily_summaries`** with the following schema:

| Field Name | Type | Required | Options/Notes                              |
|------------|------|----------|--------------------------------------------|
| `summary`  | Text | ✅ Yes   | AI-generated summary text (supports markdown) |

#### Example Record:
```json
{
  "summary": "You have 3 urgent emails requiring response, 2 meetings scheduled, and 1 pending task deadline. The most time-sensitive item is the client proposal due by 3 PM."
}
```

### API Rules (Permissions)

For both collections, configure API rules to allow read access:

1. Go to **Collection Settings** → **API Rules**
2. Set **List/Search rule** to: `""` (empty string = public read)
3. Set **View rule** to: `""` (empty string = public read)
4. Keep Create/Update/Delete restricted or add authentication as needed

> **Security Note:** If you need authentication, you'll need to modify `useOvernightSummaries.ts` to include auth tokens.

---

## Part 2: Icon Reference

The `icon` field accepts any valid [Lucide icon](https://lucide.dev/icons) name. Common icons for productivity:

| Icon Name       | Use Case                    |
|-----------------|------------------------------|
| `Mail`          | Emails                       |
| `Calendar`      | Calendar events/meetings     |
| `CheckSquare`   | Tasks/todos                  |
| `Bell`          | Notifications/reminders      |
| `AlertCircle`   | Warnings/urgent items        |
| `FileText`      | Documents                    |
| `MessageSquare` | Messages/chat                |
| `Clock`         | Time-sensitive items         |
| `Star`          | Important/starred items      |
| `Users`         | Team/people related          |
| `Briefcase`     | Work/business                |
| `CreditCard`    | Finance/billing              |
| `Package`       | Deliveries/shipping          |
| `Zap`           | Quick actions                |

---

## Part 3: n8n Workflow Setup

### Recommended Workflow Architecture

Create an n8n workflow that runs on a schedule (e.g., every morning at 6 AM) to:

1. **Fetch data** from various sources (Gmail, Google Calendar, etc.)
2. **Process & categorize** items
3. **Generate AI summary** using an LLM
4. **Push to PocketBase**

### Example n8n Workflow Nodes

#### Node 1: Schedule Trigger
- **Type:** Schedule Trigger
- **Settings:** Run at 6:00 AM daily (or your preferred time)

#### Node 2: Gmail - Get Unread Emails
- **Type:** Gmail
- **Operation:** Get Many
- **Filters:** 
  - Label: INBOX
  - Read Status: Unread
  - Received After: Last 12 hours

#### Node 3: Google Calendar - Get Events
- **Type:** Google Calendar
- **Operation:** Get Many
- **Time Min:** Today
- **Time Max:** Tomorrow

#### Node 4: Code - Transform to Cards Format
- **Type:** Code (JavaScript)
```javascript
// Transform emails to overnight_cards format
const emailCards = $('Gmail').all().map(email => ({
  title: `Email: ${email.json.subject.substring(0, 50)}`,
  description: `From ${email.json.from.emailAddress}`,
  content: email.json.snippet || email.json.subject,
  urgency: email.json.labelIds?.includes('IMPORTANT') ? 'high' : 'medium',
  icon: 'Mail',
  category: 'Email'
}));

// Transform calendar events
const calendarCards = $('Google Calendar').all().map(event => ({
  title: event.json.summary,
  description: `${new Date(event.json.start.dateTime).toLocaleTimeString()}`,
  content: event.json.description || 'No description',
  urgency: 'medium',
  icon: 'Calendar',
  category: 'Calendar'
}));

return [...emailCards, ...calendarCards].map(item => ({ json: item }));
```

#### Node 5: OpenAI - Generate Summary
- **Type:** OpenAI (or your preferred LLM)
- **Operation:** Message a Model
- **Model:** gpt-4 (or gpt-3.5-turbo)
- **Prompt:**
```
Summarize the following items for a morning briefing. Be concise and highlight urgent items:

{{ JSON.stringify($json) }}

Format: One paragraph, conversational tone, mention counts and priorities.
```

#### Node 6: PocketBase - Clear Old Cards
- **Type:** HTTP Request
- **Method:** GET
- **URL:** `https://pb.gisketch.com/api/collections/overnight_cards/records`
- Then loop through and DELETE each record

> Alternatively, keep historical data and filter by date in the app.

#### Node 7: PocketBase - Create Cards
- **Type:** HTTP Request (for each card)
- **Method:** POST
- **URL:** `https://pb.gisketch.com/api/collections/overnight_cards/records`
- **Body:**
```json
{
  "title": "{{ $json.title }}",
  "description": "{{ $json.description }}",
  "content": "{{ $json.content }}",
  "urgency": "{{ $json.urgency }}",
  "icon": "{{ $json.icon }}",
  "category": "{{ $json.category }}"
}
```

#### Node 8: PocketBase - Create Daily Summary
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://pb.gisketch.com/api/collections/daily_summaries/records`
- **Body:**
```json
{
  "summary": "{{ $('OpenAI').item.json.message.content }}"
}
```

---

## Part 4: Enabling Real Data in Navi

Once PocketBase is populated with data:

1. Open `src/hooks/useOvernightSummaries.ts`
2. Change line 6 from:
   ```typescript
   const USE_MOCK_DATA = true;
   ```
   to:
   ```typescript
   const USE_MOCK_DATA = false;
   ```
3. Rebuild and deploy the app

---

## Part 5: Testing

### Test PocketBase Connection

Run these curl commands to verify your setup:

```bash
# List overnight cards
curl https://pb.gisketch.com/api/collections/overnight_cards/records

# List daily summaries
curl https://pb.gisketch.com/api/collections/daily_summaries/records
```

### Expected Response Format

```json
{
  "page": 1,
  "perPage": 30,
  "totalItems": 3,
  "totalPages": 1,
  "items": [
    {
      "id": "abc123",
      "title": "Email from John",
      "description": "RE: Project Update",
      "content": "Full email content here...",
      "urgency": "high",
      "icon": "Mail",
      "category": "Email",
      "created": "2024-01-15 08:30:00.000Z",
      "updated": "2024-01-15 08:30:00.000Z"
    }
  ]
}
```

### Test in App

1. Open browser DevTools → Network tab
2. Load the Navi app
3. Look for requests to `pb.gisketch.com`
4. Verify 200 responses with expected data

---

## Troubleshooting

### No data showing
- Check PocketBase collection names match exactly: `overnight_cards`, `daily_summaries`
- Verify API rules allow public read access
- Check browser console for CORS errors

### CORS Errors
In PocketBase admin, add your app's domain to CORS allowed origins:
- Settings → Application → Trusted domains

### n8n Not Populating Data
- Check n8n execution logs for errors
- Verify PocketBase URL is correct
- Test API endpoints manually with curl

---

## TypeScript Interfaces Reference

For reference, here are the TypeScript interfaces the app expects:

```typescript
interface OvernightCard {
  id: string;
  title: string;
  description: string;
  content: string;
  urgency: 'low' | 'medium' | 'high';
  icon: string;
  category: string;
  created: string;
}

interface DailySummary {
  id: string;
  summary: string;
  created: string;
}
```

Ensure your PocketBase data matches these interfaces for seamless integration.
