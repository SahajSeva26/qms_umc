import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Separate from vite.config.ts on purpose — keeps the dev/build pipeline
// untouched by test-only config (jsdom environment, test globals).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // scripts/*.test.mjs are build-tooling regression tests run via plain `node --test`
    // (npm run test:scripts) — not application code, and not written against vitest's API.
    // Spread configDefaults.exclude (not a hand-copied guess) so node_modules/.git etc. stay excluded.
    exclude: [...configDefaults.exclude, 'scripts/**'],
  },
})
