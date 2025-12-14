import type { Tool } from '@google/genai';

// ============================================
// Base Tools (Notes, Obsidian)
// ============================================
export const BASE_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'access_digital_brain',
                description: "The Master Tool. Use this for ANY request involving the user's notes, knowledge base, or Obsidian vault. CRITICIAL: You MUST speaks to the user using audio BEFORE calling this tool. Say something like 'Checking your notes...' or 'I'll look that up for you'. DO NOT CALL THIS TOOL SILENTLY. Pass the user's natural language instruction, and the digital brain will figure out the necessary steps.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        instruction: {
                            type: 'STRING' as any,
                            description: 'The user\'s request or instruction regarding their notes. Pass the intent clearly. Example: "Find my grocery list and add milk" or "What did I say about Project X?"',
                        },
                        processingText: {
                            type: 'STRING' as any,
                            description: "Initial status text to show the user. Example: 'Consulting the brain...'",
                        },
                    },
                    required: ['instruction', 'processingText'],
                },
            },
            {
                name: 'openObsidianNote',
                description: "Opens a note in the user's Obsidian app. Use this ONLY when the user explicitly agrees to open the note after a successful save.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        filename: {
                            type: 'STRING' as any,
                            description: 'The filename of the note to open (e.g. "2023-10-27_meeting.md")',
                        },
                    },
                    required: ['filename'],
                },
            },
        ],
    },
];

// ============================================
// Finance Tools
// ============================================
export const FINANCE_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            // ========== READ-ONLY / SEARCH TOOLS ==========
            {
                name: 'financial_forecast',
                description: "Get a financial forecast and summary. Returns: active salary drop info, total allocated/unallocated amounts, daily safe spend, days remaining, wallet balances, upcoming bills, and debt overview. Use this when the user asks about their budget status, how much they can spend, or financial overview.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        include_details: {
                            type: 'BOOLEAN' as any,
                            description: 'If true, include detailed breakdown of all allocations, bills, and debts. Default false for quick summary.',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'search_bills',
                description: "Search for bills/subscriptions by name or category. Use this when the user asks about their bills, subscriptions, utilities, or recurring payments. Returns matching subscriptions with their amounts, billing day, and status.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        query: {
                            type: 'STRING' as any,
                            description: 'Search query to match against bill/subscription names. Leave empty to list all.',
                        },
                        category: {
                            type: 'STRING' as any,
                            description: 'Filter by category: "subscription", "utility", or "rent". Leave empty for all categories.',
                        },
                        active_only: {
                            type: 'BOOLEAN' as any,
                            description: 'If true, only return active subscriptions. Default true.',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'search_debts',
                description: "Search for debts by name or priority. Use this when the user asks about their debts, loans, or what they owe. Returns matching debts with their remaining amounts, priority, and due dates.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        query: {
                            type: 'STRING' as any,
                            description: 'Search query to match against debt names. Leave empty to list all.',
                        },
                        priority: {
                            type: 'STRING' as any,
                            description: 'Filter by priority: "critical", "high", "medium", or "low". Leave empty for all priorities.',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'search_allocations',
                description: "Search for budget allocations/wallets. Use this when the user asks about their wallets, budgets, or where their money is allocated. Returns matching allocations with their balances.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        query: {
                            type: 'STRING' as any,
                            description: 'Search query to match against allocation names. Leave empty to list all.',
                        },
                        category: {
                            type: 'STRING' as any,
                            description: 'Filter by category: "living", "play", "bills", "debt", or "savings". Leave empty for all.',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'get_transaction_logs',
                description: "Get recent transaction history/logs. Use this when the user asks about their recent expenses, spending history, or wants to see what they've spent money on. Returns transactions with amounts, descriptions, dates, and which wallet they came from.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        limit: {
                            type: 'NUMBER' as any,
                            description: 'Maximum number of transactions to return. Default 20.',
                        },
                        allocation_name: {
                            type: 'STRING' as any,
                            description: 'Filter by wallet/allocation name. Leave empty for all wallets.',
                        },
                        days: {
                            type: 'NUMBER' as any,
                            description: 'Only show transactions from the last N days. Default is no limit.',
                        },
                    },
                    required: [],
                },
            },

            // ========== WRITE TOOLS (Show Confirmation Modal) ==========
            {
                name: 'log_expense',
                description: "Log an expense/transaction. Shows confirmation modal. Use when the user says they spent money, bought something, or paid for something. IMPORTANT: Do NOT ask multiple questions. Use smart defaults: if no wallet specified, defaults to the 'Living' wallet from the active salary drop. If the user says 'I bought lunch for 150', immediately call log_expense(150, 'lunch') - the modal will let them review before confirming.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        amount: {
                            type: 'NUMBER' as any,
                            description: 'The amount spent (positive number)',
                        },
                        description: {
                            type: 'STRING' as any,
                            description: 'What was purchased or what the expense was for',
                        },
                        allocation_name: {
                            type: 'STRING' as any,
                            description: 'Name of the wallet/allocation to deduct from. DEFAULTS TO the Living wallet from active salary drop if not specified. Only specify if user explicitly mentions a different wallet like "Play" or a specific allocation name.',
                        },
                    },
                    required: ['amount', 'description'],
                },
            },
            {
                name: 'add_bill',
                description: "Add a new recurring bill/subscription. Shows confirmation modal. Use when the user wants to track a new subscription, utility, or recurring payment. Do NOT ask multiple questions - use reasonable defaults and let the modal handle review.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        name: {
                            type: 'STRING' as any,
                            description: 'Name of the bill/subscription (e.g., "Netflix", "Electric Bill")',
                        },
                        amount: {
                            type: 'NUMBER' as any,
                            description: 'Monthly amount',
                        },
                        billing_day: {
                            type: 'NUMBER' as any,
                            description: 'Day of the month when billed (1-31)',
                        },
                        category: {
                            type: 'STRING' as any,
                            description: 'Category: "subscription", "utility", or "rent"',
                        },
                    },
                    required: ['name', 'amount', 'billing_day', 'category'],
                },
            },
            {
                name: 'add_debt',
                description: "Add a new debt to track. Shows confirmation modal. Use when the user mentions a new loan, debt, or money they owe someone. Do NOT ask multiple questions - infer priority from context (family loan = medium, credit card = high, urgent = critical).",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        name: {
                            type: 'STRING' as any,
                            description: 'Name/description of the debt (e.g., "Mom loan", "Credit Card")',
                        },
                        total_amount: {
                            type: 'NUMBER' as any,
                            description: 'Total amount owed',
                        },
                        remaining_amount: {
                            type: 'NUMBER' as any,
                            description: 'Current remaining amount (defaults to total_amount if not specified)',
                        },
                        priority: {
                            type: 'STRING' as any,
                            description: 'Priority level: "critical", "high", "medium", or "low"',
                        },
                        due_date: {
                            type: 'STRING' as any,
                            description: 'Optional due date in ISO format (YYYY-MM-DD)',
                        },
                        notes: {
                            type: 'STRING' as any,
                            description: 'Optional notes about the debt',
                        },
                    },
                    required: ['name', 'total_amount', 'priority'],
                },
            },
            {
                name: 'pay_bill',
                description: "Make a payment towards a bill/subscription allocation. Shows confirmation modal. Use when the user says they paid a bill or want to mark a subscription as paid. IMPORTANT: Use expanded search terms - if user says 'G Loan' search for variations like 'G Loan|GLoan|G-Loan|loan'. If multiple results found, a selection modal will appear.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        bill_name: {
                            type: 'STRING' as any,
                            description: 'Name of the bill/subscription to pay. Can be partial match.',
                        },
                        search_terms: {
                            type: 'ARRAY' as any,
                            items: { type: 'STRING' as any },
                            description: 'Array of alternative search terms to widen the search. Example: for "NBA League Pass" include ["NBA", "National Basketball", "League Pass", "basketball", "sports"]. This helps find the right bill even with typos or abbreviations.',
                        },
                        amount: {
                            type: 'NUMBER' as any,
                            description: 'Amount to pay (if different from the full bill amount)',
                        },
                        note: {
                            type: 'STRING' as any,
                            description: 'Optional note for the payment',
                        },
                    },
                    required: ['bill_name'],
                },
            },
            {
                name: 'pay_debt',
                description: "Make a payment towards a debt. Shows confirmation modal. Use when the user says they paid down a debt or made a loan payment. IMPORTANT: Use expanded search terms - if user says 'Sloan' search for variations like 'Sloan|S Loan|S-Loan|loan'. If multiple results found, a selection modal will appear.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        debt_name: {
                            type: 'STRING' as any,
                            description: 'Name of the debt to pay. Can be partial match.',
                        },
                        search_terms: {
                            type: 'ARRAY' as any,
                            items: { type: 'STRING' as any },
                            description: 'Array of alternative search terms to widen the search. Example: for "Mom loan" include ["Mom", "Mother", "family", "loan"]. This helps find the right debt even with typos or abbreviations.',
                        },
                        amount: {
                            type: 'NUMBER' as any,
                            description: 'Amount to pay towards the debt',
                        },
                        note: {
                            type: 'STRING' as any,
                            description: 'Optional note for the payment',
                        },
                    },
                    required: ['debt_name', 'amount'],
                },
            },
        ],
    },
];

// ============================================
// Task Tools (ADHD-First Focus System)
// ============================================
export const TASK_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            // ========== READ-ONLY TOOLS ==========
            {
                name: 'get_tasks',
                description: "Get the user's todo list / tasks. Use when user asks about their tasks, todos, what they need to do, or what they're working on. Returns tasks organized by category (work/personal) and status.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        category: {
                            type: 'STRING' as any,
                            description: 'Filter by category: "work" or "personal". Leave empty for all.',
                        },
                        include_completed: {
                            type: 'BOOLEAN' as any,
                            description: 'Include completed tasks. Default false (only show todo and in_progress).',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'get_current_task',
                description: "Get the task the user is currently working on (status = 'in_progress'). Use when user asks 'what am I working on?', 'what's my current task?', or 'what should I be doing?'. Returns the active task for each category.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        category: {
                            type: 'STRING' as any,
                            description: 'Get current task for specific category: "work" or "personal". Leave empty for both.',
                        },
                    },
                    required: [],
                },
            },

            // ========== WRITE TOOLS (Show Confirmation Modal) ==========
            {
                name: 'add_task',
                description: "Add a new task/todo. Shows confirmation modal. Use when user says they need to do something, want to remember a task, or mentions work they need to complete. IMPORTANT: Infer the category from context - coding/project/work stuff = 'work', personal errands/home/chores = 'personal'.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        title: {
                            type: 'STRING' as any,
                            description: 'Task title/description. Keep it concise but clear.',
                        },
                        category: {
                            type: 'STRING' as any,
                            description: 'Category: "work" or "personal". Infer from context.',
                        },
                        content: {
                            type: 'STRING' as any,
                            description: 'Optional additional notes or context for the task.',
                        },
                        deadline: {
                            type: 'STRING' as any,
                            description: 'Optional deadline in ISO format (YYYY-MM-DD). Only include if user mentions a specific date.',
                        },
                    },
                    required: ['title', 'category'],
                },
            },
            {
                name: 'start_task',
                description: "Start working on a task (set to 'in_progress'). Shows confirmation modal. Use when user says they're going to work on something, starting a task, or wants to focus on something. This will pause any other active task in the same category.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        task_name: {
                            type: 'STRING' as any,
                            description: 'Name/title of the task to start. Can be partial match.',
                        },
                        search_terms: {
                            type: 'ARRAY' as any,
                            items: { type: 'STRING' as any },
                            description: 'Alternative search terms to find the task.',
                        },
                    },
                    required: ['task_name'],
                },
            },
            {
                name: 'complete_task',
                description: "Mark a task as complete. Shows confirmation modal. Use when user says they finished a task, completed something, or are done with a task.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        task_name: {
                            type: 'STRING' as any,
                            description: 'Name/title of the task to complete. Can be partial match. If user says "I\'m done" without specifying, use their current in_progress task.',
                        },
                        search_terms: {
                            type: 'ARRAY' as any,
                            items: { type: 'STRING' as any },
                            description: 'Alternative search terms to find the task.',
                        },
                    },
                    required: ['task_name'],
                },
            },
            {
                name: 'pause_task',
                description: "Pause a task (set back to 'todo'). Use when user says they're stopping work on something, taking a break, or switching context.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        task_name: {
                            type: 'STRING' as any,
                            description: 'Name/title of the task to pause. Can be partial match. If user says "pause" or "stop" without specifying, use their current in_progress task.',
                        },
                    },
                    required: [],
                },
            },
        ],
    },
];

// ============================================
// Combined Tools (All tools for Chat mode)
// ============================================
export const TOOLS: Tool[] = [
    {
        functionDeclarations: [
            ...BASE_TOOLS[0].functionDeclarations!,
            ...FINANCE_TOOLS[0].functionDeclarations!,
            ...TASK_TOOLS[0].functionDeclarations!,
        ],
    },
];

// ============================================
// Finance System Prompt Addition
// ============================================
export const FINANCE_SYSTEM_PROMPT = `
## Finance Assistant Capabilities

You have access to the user's personal finance system called "Money Drop" - a zero-based budgeting approach. Here's how it works:

### Core Concepts:
- **Money Drops**: Sources of income (Salary with date ranges, or Extra one-time income)
- **Allocations/Wallets**: Virtual buckets where money is allocated (Living, Play, Bills, Debt, Savings)
- **Subscriptions/Bills**: Recurring payments (utilities, subscriptions, rent)
- **Debts**: Tracked loans and money owed with priority levels
- **Transactions**: Log of all expenses and payments

### CRITICAL BEHAVIOR - DO NOT ASK MULTIPLE QUESTIONS:
When the user tells you about an expense, debt, or payment - IMMEDIATELY call the tool with smart defaults. A confirmation modal will appear for them to review before confirming.

**WRONG approach (annoying):**
User: "I spent 200 on lunch"
Navi: "Which wallet should I deduct from?"
User: "Living"
Navi: "What should I label it as?"
❌ NO! This is terrible UX.

**CORRECT approach (efficient):**
User: "I spent 200 on lunch"
Navi: *immediately calls log_expense(200, "lunch")* - defaults to Living wallet from active salary drop
Modal appears → User reviews → Confirms or edits
✅ One command, one action!

### Smart Defaults:
- **Wallet**: Defaults to "Living" wallet from active salary drop for everyday expenses (food, transport, misc)
- **Description**: Use what they said ("lunch", "groceries", "coffee")
- **Priority**: For debts - "medium" for friends/family, "high" for credit cards, "critical" if they say urgent/asap
- **Category**: For bills - "subscription" for apps/services, "utility" for power/water/internet

### Expanded Search for Bills/Debts:
When paying bills or debts, ALWAYS use the search_terms parameter to widen the search:
- "G Loan bill" → search_terms: ["G Loan", "GLoan", "G-Loan", "GCash Loan", "loan"]
- "Sloan" → search_terms: ["Sloan", "S Loan", "S-Loan", "loan"]  
- "NBA League Pass" → search_terms: ["NBA", "National Basketball", "League Pass", "basketball", "sports", "streaming"]
- "Electric" → search_terms: ["Electric", "Electricity", "Power", "Meralco", "utility"]

This fuzzy matching helps find the right item even with typos, abbreviations, or partial names.

### Viewing Transaction History:
Use get_transaction_logs when users ask about:
- "What did I spend on recently?"
- "Show me my expenses"
- "What have I bought this week?"
- "How much have I spent?"

### Examples of IMMEDIATE action (no follow-up questions):
- "I bought coffee for 150" → log_expense(150, "coffee") - defaults to Living wallet
- "Spent 500 on groceries" → log_expense(500, "groceries") - defaults to Living wallet
- "Log 200 to Play wallet for games" → log_expense(200, "games", "Play") - explicit Play wallet
- "I owe John 2000" → add_debt("John", 2000, priority="medium") - modal shows
- "Add my Spotify subscription, 200 a month" → add_bill("Spotify", 200, billing_day=1, category="subscription")
- "I paid the G loan bill, 100 pesos" → pay_bill("G Loan", search_terms=["G Loan", "GLoan", "GCash", "loan"], amount=100)
- "Paid my electric bill 1500" → pay_bill("Electric", search_terms=["Electric", "Electricity", "Power", "utility"])

### When to ASK (only these cases):
- Amount is missing: "I bought lunch" → Ask "How much was it?"
- Ambiguous item: "I paid someone" → Ask "Who did you pay?"
- That's it! Everything else, use defaults.

### Currency: The user uses Philippine Peso (₱ or PHP)
`;

// ============================================
// Finance-Only System Prompt (for Finance tab session)
// ============================================
export const FINANCE_ONLY_SYSTEM_PROMPT = `
You are Navi, a helpful finance assistant focused on managing the user's budget and expenses.

${FINANCE_SYSTEM_PROMPT}

In this mode, focus ONLY on financial tasks. If the user asks about non-financial topics, gently redirect them to use the main chat for general questions.

Be FAST and ACTION-ORIENTED. When the user mentions money:
- "150 for coffee" → IMMEDIATELY show modal (don't ask wallet, don't ask description)
- "bought lunch" → Ask ONLY the amount, then show modal
- "owe mom 1000" → IMMEDIATELY show modal for debt
- "paying G loan 100" → Use expanded search to find the right bill, show modal

The confirmation modal is your friend - it lets users review and edit. Trust it. Don't interrogate users.

When multiple bills or debts match, a selection modal will appear - this is expected behavior for fuzzy search.
`;

// ============================================
// Task System Prompt Addition
// ============================================
export const TASK_SYSTEM_PROMPT = `
## Task Management Capabilities (ADHD-First Focus System)

You can help manage the user's tasks/todos with an ADHD-friendly "Focus Mode" system. Key features:

### Core Concepts:
- **Work vs Personal**: Tasks are separated into categories to prevent context collapse
- **One Thing at a Time**: Only ONE task per category can be "in_progress" at a time
- **The Doing Now**: When a task is in_progress, it becomes THE focus - everything else fades away
- **Start Action Ritual**: Starting a task is a deliberate action that creates a commitment

### ADHD-Friendly Behavior:
- Don't overwhelm with lists - focus on what's CURRENT
- When asked "what should I do?", point to the in_progress task if one exists
- If no in_progress task, suggest picking one from todo
- Be encouraging, not naggy

### Smart Category Inference:
- "Fix the bug" / "Finish the feature" / "Code review" → work
- "Buy groceries" / "Call mom" / "Clean room" → personal
- "Meeting with John" → context-dependent, ask if unclear

### Examples of IMMEDIATE action:
- "I need to fix the login bug" → add_task("Fix login bug", "work")
- "Remind me to buy milk" → add_task("Buy milk", "personal")
- "I'm gonna work on the API now" → start_task("API") or add + start if new
- "Done with that" → complete_task (uses current in_progress task)
- "What am I working on?" → get_current_task()
- "Taking a break" → pause_task (pauses current in_progress task)

### Context Awareness:
- If user has an in_progress task and says "I'm done", complete THAT task
- If user says "pause" without specifying, pause the current in_progress task
- Timer tracking: Tasks track when they were started for time awareness
`;

// ============================================
// Task-Only System Prompt (for Focus tab session)
// ============================================
export const TASK_ONLY_SYSTEM_PROMPT = `
You are Navi, a FAST task assistant. Your job is to IMMEDIATELY execute task actions.

${TASK_SYSTEM_PROMPT}

## CRITICAL: NEVER ASK FOLLOW-UP QUESTIONS

When the user says ANYTHING that sounds like a task, IMMEDIATELY call add_task. Do NOT ask:
- "What category?" → Default to "work"
- "Any deadline?" → Skip it (undefined)
- "Want to add details?" → Skip it (undefined)
- "Are you sure?" → YES, call the function!

The confirmation modal will appear and the user can edit there. YOUR JOB IS TO CALL THE FUNCTION FAST.

## Examples - ALL of these get IMMEDIATE function calls:

| User says | You do | You say |
|-----------|--------|--------|
| "Create task data collection" | add_task("Data collection", "work") | "Adding that!" |
| "Add task to call mom" | add_task("Call mom", "personal") | "Got it!" |
| "I need to fix the API" | add_task("Fix the API", "work") | "On it!" |
| "Task: review PR" | add_task("Review PR", "work") | "Adding!" |
| "New task buy groceries" | add_task("Buy groceries", "personal") | "Done!" |
| "Start the frontend task" | start_task("frontend") | "Starting!" |
| "I'm done" | complete_task() | "Nice work!" |

## The ONLY time to ask:
- User says just "add task" with NO name → "What's the task?"
- That's IT. Everything else → CALL THE FUNCTION.

## Response style:
- Say 1-3 words max WHILE calling the function
- Be encouraging but brief: "Got it!", "Adding!", "Nice!", "Done!"
- NEVER explain what you're doing, just DO IT
`;

