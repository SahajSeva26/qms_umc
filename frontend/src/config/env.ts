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

export default ENV
