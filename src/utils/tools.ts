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
                description: "Log an expense/transaction. Shows confirmation modal. Use when the user says they spent money, bought something, or paid for something. IMPORTANT: Do NOT ask multiple questions. Use smart defaults: if no wallet specified, use 'Living'. If the user says 'I bought lunch for 150', immediately call log_expense(150, 'lunch', 'Living') - the modal will let them review before confirming.",
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
                            description: 'Name of the wallet/allocation to deduct from. DEFAULTS TO "Living" if not specified. Only ask if user explicitly mentions a different wallet.',
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
// Combined Tools (All tools for Chat mode)
// ============================================
export const TOOLS: Tool[] = [
    {
        functionDeclarations: [
            ...BASE_TOOLS[0].functionDeclarations!,
            ...FINANCE_TOOLS[0].functionDeclarations!,
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
Navi: *immediately calls log_expense(200, "lunch", "Living")*
Modal appears → User reviews → Confirms or edits
✅ One command, one action!

### Smart Defaults:
- **Wallet**: Default to "Living" for everyday expenses (food, transport, misc)
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
- "I bought coffee for 150" → log_expense(150, "coffee") - modal shows, defaults to Living
- "Spent 500 on groceries" → log_expense(500, "groceries") - modal shows
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
