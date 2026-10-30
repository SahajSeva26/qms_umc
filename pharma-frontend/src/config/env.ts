// Production serves both apps from ONE public origin, path-routed by a CDN/reverse proxy
// (internal owns '/', pharma owns '/pharma/*') — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5.
// A navigation to an internal path (e.g. the shared /auth/login) in production is therefore just
// a relative path; the proxy decides which build actually serves it. Only LOCAL DEV genuinely has
// two different origins (different Vite ports, no proxy in front), so an absolute cross-origin URL
// is only ever built there, from an explicit, OPTIONAL dev-only override — never required, and
// never meaningful in a production build.
const INTERNAL_DEV_ORIGIN_FALLBACK = 'http://localhost:5173'

function internalDevOrigin(): string | null {
  const configured = import.meta.env.VITE_INTERNAL_DEV_ORIGIN
  if (import.meta.env.PROD) {
    if (configured) {
      throw new Error(
        'VITE_INTERNAL_DEV_ORIGIN is a local-development-only override and must not be set in a production build — production reaches the shared login through the same public origin via the deployment proxy, not a configured cross-origin URL.',
      )
    }
    return null
  }
  if (configured && !/^https?:\/\/localhost(:\d+)?$/.test(configured)) {
    throw new Error(`VITE_INTERNAL_DEV_ORIGIN must be a bare http(s)://localhost[:port] origin, got: ${configured}`)
  }
  return configured || INTERNAL_DEV_ORIGIN_FALLBACK
}

const ENV = {
  Api: { BaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' },
  App: {
    Environment: import.meta.env.VITE_ENV || 'development',
    Name: 'QMS Pharma Portal',
  },
  // Both empty until set — LocationPicker treats either as "not configured"
  // and renders a fallback rather than attempting to load the Maps SDK.
  Maps: {
    ApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    MapId: import.meta.env.VITE_GOOGLE_MAP_ID || '',
  },
} as const

/**
 * The href to navigate to for a path that belongs to the internal-frontend build (e.g. the shared
 * '/auth/login'). In production this is the SAME relative path, unchanged — correct because both
 * apps share one public origin and the proxy routes everything outside '/pharma/*' to the internal
 * build. In local dev (no proxy in front) it's prefixed with internal-frontend's own dev-server
 * origin so the browser actually reaches the right process.
 */
export function internalHref(path: string): string {
  const devOrigin = internalDevOrigin()
  return devOrigin ? `${devOrigin}${path}` : path
}

export default ENV
