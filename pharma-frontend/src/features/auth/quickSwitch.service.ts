import api from '@/lib/api/api'

export interface QuickSwitchCredentials {
  email: string
  password: string
}

export const quickSwitchService = {
  login: (credentials: QuickSwitchCredentials) => api.post('/auth/login', credentials),
}
