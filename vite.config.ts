import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon2.png', 'audio-processor.js'],
      manifest: false, // We use our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __COMMIT_HASH__: JSON.stringify((() => {
      try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch (e) { return 'unknown'; }
    })()),
    __COMMIT_COUNT__: JSON.stringify((() => {
      try { return execSync('git rev-list --count HEAD').toString().trim(); } catch (e) { return '0'; }
    })()),
  },
})
