import type { Tool } from '@google/genai';

export const TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'saveNote',
                description: "Saves a note to the user's obsidian vault. The model should generate the 'processingText' and 'savingText' arguments based on the context of the note to provide a personalized experience. When calling this tool do not say \"I have saved it\" or \"It is done\" immediately. REPLY SHORT AND CONCISE. You must wait for the tool to complete. Instead, say something like \"On it...\" or \"Checking...\" or \"Let me handle that...\" and then WAIT. Only confirm success once the tool returns its result.",
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
        ],
    },
];
