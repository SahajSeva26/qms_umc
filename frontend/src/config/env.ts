const ENV = {
  Api: { BaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1' },
  App: {
    Environment: import.meta.env.VITE_ENV || 'development',
    Name: 'QMS Healthcare Operations',
  },
} as const

export default ENV
