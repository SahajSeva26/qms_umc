import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Production serves this build under '/pharma/*' at the SAME public origin as internal-frontend
// (one domain, path-routed by the deployment proxy — see
// md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5), so its emitted asset URLs must be rooted at
// '/pharma/', not '/' (a '/' base would make the browser request assets from the INTERNAL build's
// root, colliding with its own assets there). Local dev keeps base at '/' — the dev server runs
// standalone on its own port with no proxy in front, and this app's own router already expects
// requests rooted at '/' in that mode (its routes already read as '/pharma/mr' etc. relative to
// the router's own root, which only matches a '/' base).
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? '/pharma/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
}))
