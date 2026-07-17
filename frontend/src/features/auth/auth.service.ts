import api from '@/lib/api/api'
import type { LoginPayload, AuthUser } from '@/types/auth.types'
import type { ApiResponse } from '@/types/common.types'

const login = async (payload: LoginPayload) => {
  const res = await api.post<ApiResponse<AuthUser>>('/auth/login', payload)
  return res.data
}

const logout = async () => {
  const res = await api.post<ApiResponse<null>>('/auth/logout')
  return res.data
}

// POST /auth/refresh-token reads the refresh token from its own httpOnly
// cookie (no body needed) and, on success, sets new access+refresh cookies
// via Set-Cookie — the JSON response body itself carries no token data.
// Used by lib/api/api.ts's response interceptor to silently retry a request
// that failed on an expired access token, instead of hard-redirecting to login.
const refreshToken = async () => {
  const res = await api.post<ApiResponse<null>>('/auth/refresh-token')
  return res.data
}

const getMe = async () => {
  // TODO: wire to GET /auth/me once endpoint exists
  const res = await api.get<ApiResponse<AuthUser>>('/auth/me')
  return res.data
}

export const authService = { login, logout, getMe, refreshToken }
