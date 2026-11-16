/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The site lives at https://haruki7315.github.io/photo-focus/,
// so every file path must start with /photo-focus/.
export default defineConfig({
  base: '/photo-focus/',
  plugins: [
    react(),
    // Service worker: saves the app itself (code, styles, fonts, icons) so it opens with no internet.
    // Your photos, music and stats live in IndexedDB, not in this cache.
    VitePWA({
      registerType: 'prompt', // never reload by itself in the middle of a focus session
      injectRegister: false, // we register it ourselves in src/platform/serviceWorker.ts
      manifest: false, // we already ship public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
