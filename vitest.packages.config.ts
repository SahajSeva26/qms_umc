import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Root-level test command for the shared packages (@qms/core, @qms/ui, @qms/widgets) themselves.
// Before this, their tests only ran as a side effect of internal-frontend's own vitest.config.ts
// include globs — pharma-frontend's test command never ran them at all, so a shared-package
// regression a pharma-only change introduced could silently pass CI. `npm run test:packages`
// (root package.json) runs this explicitly, independent of either app's own test command.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './internal-frontend/src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./internal-frontend/src/test/setup.ts'],
    include: ['packages/*/src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: [...configDefaults.exclude],
  },
})
