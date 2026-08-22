import api from '@/lib/api/api'
import type { LoginPayload, AuthUser } from '@/features/auth/auth.types'
import type { ApiResponse } from '@/types/common.types'

const login = async (payload: LoginPayload) => {
  const res = await api.post<ApiResponse<AuthUser>>('/auth/login', payload)
  return res.data
}

const logout = async () => {
  const res = await api.post<ApiResponse<null>>('/auth/logout')
  return res.data
}

export const authService = { login, logout }
