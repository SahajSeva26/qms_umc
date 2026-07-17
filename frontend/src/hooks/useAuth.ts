import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import { INTERNAL_ROLES, PHARMA_ROLES } from '@/lib/roles'
import { authService } from '@/features/auth/auth.service'
import type { UserRole } from '@/types/auth.types'

export const useAuth = () => {
  const { user, clearAuth } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const isAuthenticated = !!user

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const isQmsInternal = () => !!user && (INTERNAL_ROLES as readonly string[]).includes(user.role)
  const isPharma      = () => !!user && (PHARMA_ROLES  as readonly string[]).includes(user.role)

  const signOut = () => {
    // Fire-and-forget: tell the backend to invalidate this session (clears
    // its own access/refresh cookies via Set-Cookie and drops the stored
    // refresh token server-side, see AuthService.logout). Previously this
    // was NEVER called — signOut only cleared local frontend state, so the
    // httpOnly cookies stayed fully valid server-side after "logging out."
    // That went unnoticed while there was no session-restore logic to
    // exploit it; now that GET /auth/me correctly restores a session from
    // a still-valid cookie, a stale cookie post-"logout" would let the
    // session silently come back on the next reload/navigation. Not
    // awaited — a failed/slow logout call on the backend shouldn't block
    // the user from being logged out locally; the local clear below is
    // unconditional regardless of how this call resolves.
    authService.logout().catch(() => {})
    clearAuth()
    // Clear EVERY cached query (session, tenants, roles, role types,
    // permission groups, etc.), not just the session key — this also
    // covers what a narrower clearSession() call would have done. Without
    // this, on a shared machine, User A logs out, User B logs in within
    // the 5-minute staleTime, and any list/detail view B opens could
    // render A's still-cached data until that specific query naturally
    // refetches. Defense-in-depth data hygiene, not a real security
    // boundary (the backend's own per-request authorization is what
    // actually protects this data) — but no reason to leave stale
    // cross-user data sitting in memory when a full clear is one line.
    queryClient.clear()
    navigate(AUTH_ROUTES.LOGIN, { replace: true })
  }

  return { user, isAuthenticated, hasRole, isQmsInternal, isPharma, signOut }
}
