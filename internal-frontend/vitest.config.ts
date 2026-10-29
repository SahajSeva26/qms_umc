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
    // Shared packages (@qms/core, @qms/ui, @qms/widgets) have their own root-level test command
    // (`npm run test:packages`, see ../vitest.packages.config.ts) — not included here, so neither
    // app's own test run silently skips them and they aren't run twice across CI.
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    // scripts/*.test.mjs are build-tooling regression tests run via plain `node --test`
    // (npm run test:scripts) — not application code, and not written against vitest's API.
    // Spread configDefaults.exclude (not a hand-copied guess) so node_modules/.git etc. stay excluded.
    exclude: [...configDefaults.exclude, 'scripts/**'],
    // Capping worker count prevents all ~245 files from contending for every core at once —
    // that contention, not shared state, was flipping Testing Library's default 1000ms
    // waitFor/findBy timeout under full-suite load. `poolOptions.forks.maxForks` is ignored by
    // Vitest 4 — `maxWorkers` is the real top-level option.
    maxWorkers: 8,
    testTimeout: 10_000,
  },
})
