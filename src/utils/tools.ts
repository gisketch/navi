import type { Tool } from '@google/genai';

export const TOOLS: Tool[] = [
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
