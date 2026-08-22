import api from '@/lib/api/api'
import { validateApiResponse } from '@/lib/api/validateApiResponse'
import { AuthMeResponseSchema, LoginResponseSchema } from '@/features/auth/auth.schemas'
import type { LoginPayload, AuthUser } from '@/features/auth/auth.types'
import type { ApiResponse } from '@/types/common.types'
import type { SessionResponse } from '@/types/session.types'

const login = async (payload: LoginPayload) => {
  const res = await api.post<ApiResponse<AuthUser>>('/auth/login', payload)
  validateApiResponse(LoginResponseSchema, res.data, '/auth/login')
  return res.data
}

const logout = async () => {
  const res = await api.post<ApiResponse<null>>('/auth/logout')
  return res.data
}

const getMe = async () => {
  const res = await api.get<ApiResponse<SessionResponse>>('/auth/me')
  validateApiResponse(AuthMeResponseSchema, res.data, '/auth/me')
  return res.data
}

export const authService = { login, logout, getMe }
