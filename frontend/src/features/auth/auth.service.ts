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

const getMe = async () => {
  // TODO: wire to GET /auth/me once endpoint exists
  const res = await api.get<ApiResponse<AuthUser>>('/auth/me')
  return res.data
}

export const authService = { login, logout, getMe }
