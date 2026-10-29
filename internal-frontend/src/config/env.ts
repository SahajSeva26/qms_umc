// Production serves both apps from ONE public origin, path-routed by a CDN/reverse proxy
// (internal owns '/', pharma owns '/pharma/*') — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5.
// A navigation to a pharma path in production is therefore just a relative path; the proxy
// decides which build actually serves it. Only LOCAL DEV genuinely has two different origins
// (different Vite ports, no proxy in front), so an absolute cross-origin URL is only ever built
// there, from an explicit, OPTIONAL dev-only override — never required, and never meaningful in a
// production build (a production override here would mean someone fat-fingered the public domain
// into frontend config instead of the proxy owning routing, which is exactly the class of
// misconfiguration this is designed to make structurally impossible).
const PHARMA_DEV_ORIGIN_FALLBACK = 'http://localhost:5174'

function pharmaDevOrigin(): string | null {
  const configured = import.meta.env.VITE_PHARMA_DEV_ORIGIN
  if (import.meta.env.PROD) {
    if (configured) {
      throw new Error(
        'VITE_PHARMA_DEV_ORIGIN is a local-development-only override and must not be set in a production build — production reaches /pharma/* through the same public origin via the deployment proxy, not a configured cross-origin URL.',
      )
    }
    return null
  }
  if (configured && !/^https?:\/\/localhost(:\d+)?$/.test(configured)) {
    throw new Error(`VITE_PHARMA_DEV_ORIGIN must be a bare http(s)://localhost[:port] origin, got: ${configured}`)
  }
  return configured || PHARMA_DEV_ORIGIN_FALLBACK
}

const ENV = {
  Api: { BaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' },
  App: {
    Environment: import.meta.env.VITE_ENV || 'development',
    Name: 'QMS Healthcare Operations',
  },
  // Both empty until set — LocationPicker treats either as "not configured"
  // and renders a fallback rather than attempting to load the Maps SDK.
  Maps: {
    ApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    MapId: import.meta.env.VITE_GOOGLE_MAP_ID || '',
  },
} as const

/**
 * The href to navigate to for a path that belongs to the pharma-frontend build (e.g.
 * '/pharma/mr'). In production this is the SAME relative path, unchanged — correct because both
 * apps share one public origin and the proxy routes '/pharma/*' to the pharma build. In local dev
 * (no proxy in front) it's prefixed with pharma-frontend's own dev-server origin so the browser
 * actually reaches the right process. `path` must already be a validated, well-formed relative
 * path (see features/auth/returnTo.ts) — this function does not itself sanitize input.
 */
export function pharmaHref(path: string): string {
  const devOrigin = pharmaDevOrigin()
  return devOrigin ? `${devOrigin}${path}` : path
}

export default ENV
