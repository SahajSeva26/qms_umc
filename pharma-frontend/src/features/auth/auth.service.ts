import api from '@/lib/api/api'
import type { ApiResponse } from '@qms/core'

// The backend awaits session invalidation before clearing cookies (see
// backend/src/modules/auth/auth.controller.ts logout) — callers must await this
// resolving before redirecting away, or an aborted/cancelled request can leave
// the server-side refresh token (and the browser's cookies) still valid.
const logout = async () => {
  const res = await api.post<ApiResponse<null>>('/auth/logout')
  return res.data
}

export const authService = { logout }
