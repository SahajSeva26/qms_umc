import { defineConfig } from 'vitest/config'
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
    // @qms/ui and @qms/core have no test runner of their own yet — their co-located tests run
    // via this app's Vitest until those packages get their own.
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)',
      '../packages/ui/src/location/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      '../packages/core/src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    // Capping worker count prevents all ~245 files from contending for every core at once —
    // that contention, not shared state, was flipping Testing Library's default 1000ms
    // waitFor/findBy timeout under full-suite load. `poolOptions.forks.maxForks` is ignored by
    // Vitest 4 — `maxWorkers` is the real top-level option.
    maxWorkers: 8,
    testTimeout: 10_000,
  },
})
