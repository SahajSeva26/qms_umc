const ENV = {
  Api: { BaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' },
  App: {
    Environment: import.meta.env.VITE_ENV || 'development',
    Name: 'QMS Pharma Portal',
  },
  // Where this app sends a session that turns out to be internal-only, per
  // the Decided login flow (md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5).
  Hosts: {
    InternalOrigin: import.meta.env.VITE_INTERNAL_ORIGIN || 'http://localhost:5173',
  },
  // Both empty until set — LocationPicker treats either as "not configured"
  // and renders a fallback rather than attempting to load the Maps SDK.
  Maps: {
    ApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    MapId: import.meta.env.VITE_GOOGLE_MAP_ID || '',
  },
} as const

export default ENV
