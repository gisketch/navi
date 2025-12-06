/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;
declare const __COMMIT_COUNT__: string;
