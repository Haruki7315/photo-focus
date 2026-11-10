/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site lives at https://haruki7315.github.io/photo-focus/,
// so every file path must start with /photo-focus/.
export default defineConfig({
  base: '/photo-focus/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
