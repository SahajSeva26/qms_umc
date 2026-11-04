// Re-exports the shared implementation — @qms/ui is the single real `cn()`,
// this file exists only so shadcn's CLI (components.json's `utils` alias)
// has a local @/lib/utils to write newly-added components against.
export { cn } from '@qms/ui'
