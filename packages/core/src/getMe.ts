import type { AxiosInstance } from 'axios'
import { validateApiResponse } from './validateApiResponse'
import { AuthMeResponseSchema } from './session.schema'
import type { ApiResponse } from './common.types'
import type { SessionResponse } from './session.types'

// GET /auth/me — the one authoritative session fetch both apps build their own
// useSession() around. Takes the CALLING app's own configured axios instance
// (base URL, interceptors, credentials) rather than owning one itself, so this
// package stays independent of either app's API client configuration.
export async function getMe(api: AxiosInstance) {
  const res = await api.get<ApiResponse<SessionResponse>>('/auth/me')
  validateApiResponse(AuthMeResponseSchema, res.data, '/auth/me')
  return res.data
}
