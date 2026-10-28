import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

// Matches the browser-specific error text a failed dynamic import() throws
// (React Router's `lazy:` route loaders use a plain import() under the
// hood). This is the exact failure mode of a stale deployment: a user's tab
// still references a chunk hash from before the last deploy, and the CDN no
// longer serves that file. A hard reload fetches the current index.html
// (and therefore the current chunk hashes) and fixes it — anything short of
// a reload cannot, since the stale reference lives in already-loaded JS.
const CHUNK_LOAD_FAILURE_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'load failed', // Safari's generic dynamic-import network error text
]

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  return CHUNK_LOAD_FAILURE_PATTERNS.some((pattern) => lower.includes(pattern))
}

// Root/AppLayout `errorElement` — catches anything an authenticated route
// tree throws that isn't handled locally: render errors, and specifically
// lazy-chunk load failures (stale deployment, dropped connection mid-fetch).
// Rendered in place of the ENTIRE matched route tree it's attached to (React
// Router's errorElement semantics) — at the root this replaces the whole
// app; when also attached at the AppLayout level, an error inside the authed
// shell's children is caught there instead, without losing the root.
const RouteErrorBoundary = () => {
  const error = useRouteError()
  const chunkFailure = isChunkLoadError(error)

  const status = isRouteErrorResponse(error) ? error.status : null
  const detail = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.statusText : undefined

  return (
    <div className="flex h-dvh w-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="bg-danger-soft mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <FiAlertTriangle size={26} className="text-danger" />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
          {chunkFailure ? 'A new version of QMS is available' : 'Something went wrong'}
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--qms-text-muted)' }}>
          {chunkFailure
            ? 'This page was updated since you loaded it. Refresh to get the latest version.'
            : status
              ? `Error ${status}${detail ? ` — ${detail}` : ''}`
              : 'An unexpected error occurred while loading this page. Refreshing usually fixes it.'}
        </p>
        <Button onClick={() => window.location.reload()}>
          <FiRefreshCw size={14} /> Refresh
        </Button>
      </div>
    </div>
  )
}

export default RouteErrorBoundary
