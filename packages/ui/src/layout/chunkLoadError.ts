// Matches the browser-specific error text a failed dynamic import() throws (React Router's
// `lazy:` route loaders, and any plain React.lazy(() => import(...)), use a plain import()
// under the hood). This is the exact failure mode of a stale deployment: a user's tab still
// references a chunk hash from before the last deploy, and the CDN no longer serves that file.
// A hard reload fetches the current index.html (and therefore the current chunk hashes) and
// fixes it — anything short of a reload cannot, since the stale reference lives in already-
// loaded JS. Shared by RouteErrorBoundary (route-level) and DialogErrorBoundary (dialog-level,
// pharma-frontend) — both need to distinguish "retry the same render" from "this chunk hash is
// gone, only a reload can fetch a current one."
const CHUNK_LOAD_FAILURE_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'load failed', // Safari's generic dynamic-import network error text
]

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  return CHUNK_LOAD_FAILURE_PATTERNS.some((pattern) => lower.includes(pattern))
}
