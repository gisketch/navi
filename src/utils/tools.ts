import type { Tool } from '@google/genai';

export const TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'saveNote',
                description: "Saves a note to the user's obsidian vault. The model should generate the 'processingText' and 'savingText' arguments based on the context of the note to provide a personalized experience. When calling this tool do not say \"I have saved it\" or \"It is done\" immediately. REPLY SHORT AND CONCISE. You must wait for the tool to complete. Instead, say something like \"On it...\" or \"Checking...\" or \"Let me handle that...\" and then WAIT. Upon successful completion (when you receive the result), you MUST say something along the lines of 'I generated the note for you, would you like to see it?' (not really word for word but the same idea, just put personality into it or context)",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        content: {
                            type: 'STRING' as any,
                            description: 'The content of the note to be saved. Should be the exact transcript of what the user said. So no need for clarifications, when this tool is called, just say verbatim in here what the user want in the note saved. Even if its gibberish',
                        },
                        processingText: {
                            type: 'STRING' as any,
                            description: "Text to show while the note is being processed (status: processing). Example: 'Drafting your note about Castlevania...'",
                        },
                        savingText: {
                            type: 'STRING' as any,
                            description: "Text to show while the note is being saved to storage (status: saving). Example: 'Saving to your Vault...'",
                        },
                    },
                    required: ['content', 'processingText', 'savingText'],
                },
            },
            {
                name: 'searchNotes',
                description: "Searches the user's notes for information. Use this when the user asks a question about their notes or asks you to find something they wrote down. Like saveNote, reply with a short confirmation like 'Searching...' and WAIT.",
                parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                        query: {
                            type: 'STRING' as any,
                            description: 'The search query or question to answer from the notes.',
                        },
                        processingText: {
                            type: 'STRING' as any,
                            description: "Status text for 'processing' state. Example: 'Processing request...'",
                        },
                        searchingText: {
                            type: 'STRING' as any,
                            description: "Status text for 'searching' state (finding files). Example: 'Searching vault...'",
                        },
                        readingText: {
                            type: 'STRING' as any,
                            description: "Status text for 'reading' state (reading content). Example: 'Reading notes...'",
                        },
                    },
                    required: ['query', 'processingText', 'searchingText', 'readingText'],
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
