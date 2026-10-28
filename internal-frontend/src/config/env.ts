// A production build with VITE_PHARMA_ORIGIN unset would otherwise silently fall back to
// localhost, cross-origin redirecting every real pharma user to a dead local dev server. Required
// in production; the localhost default is for local dev only.
function requiredInProd(value: string | undefined, name: string, devDefault: string): string {
  if (value) return value
  if (import.meta.env.PROD) {
    throw new Error(`${name} is required in a production build — refusing to fall back to a localhost default.`)
  }
  return devDefault
}

const ENV = {
  Api: { BaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' },
  App: {
    Environment: import.meta.env.VITE_ENV || 'development',
    Name: 'QMS Healthcare Operations',
  },
  // Where a pharma session is sent after login — the separately-hosted pharma-frontend app, per
  // the Decided login flow (md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5). Real-domain CORS/cookie
  // behavior across these two origins is NOT yet verified — this only fixes the redirect
  // mechanism itself (cross-origin navigation instead of an in-app Navigate to internal-frontend's
  // own, now-superseded /pharma/* pages, left in place but unreachable via normal login).
  Hosts: {
    PharmaOrigin: requiredInProd(import.meta.env.VITE_PHARMA_ORIGIN, 'VITE_PHARMA_ORIGIN', 'http://localhost:5174'),
  },
  // Both empty until set — LocationPicker treats either as "not configured"
  // and renders a fallback rather than attempting to load the Maps SDK.
  Maps: {
    ApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    MapId: import.meta.env.VITE_GOOGLE_MAP_ID || '',
  },
} as const

export default ENV
