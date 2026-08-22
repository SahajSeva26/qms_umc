import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { authService } from '@/features/auth/auth.service'
import type { SessionResponse } from '@/types/session.types'

// The ONE central session hook, owning the single GET /auth/me fetch that
// every permission/role check derives from. Does not replace `useAuth`/`useAuthStore`.

export const SESSION_QUERY_KEY = ['session'] as const

/** The exact backend bypass-all permission code (shared/env/permissions.ts SYSTEM.MANAGE.code). */
const SYSTEM_MANAGE_CODE = 'system:manage'

export const useSession = () => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => authService.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes — permissions rarely change mid-session
    // Never retry a 401 (no valid session) — retrying doubles isLoading
    // time, and SessionBootstrap blocks the whole router on isLoading.
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) return false
      return failureCount < 1
    },
  })

  const session: SessionResponse | null = query.data?.data ?? null
  const permissions = session?.permissions ?? []

  const isAuthenticated = !!session

  // Distinguishes a real 401 (genuinely logged out) from other failures
  // (429 rate-limit, network blip, 5xx). Consumers deciding whether to
  // hard-redirect to login MUST key off this, not isError/!session alone.
  const isConfirmedUnauthenticated = query.isError && axios.isAxiosError(query.error) && query.error.response?.status === 401

  // Mirrors backend `authorizeMiddleware.ts` hasAnyPermissions/hasAllPermissions
  // exactly: a caller holding `system:manage` bypasses every check unconditionally.
  const isSystemManage = permissions.includes(SYSTEM_MANAGE_CODE)

  /** Single-code check. `system:manage` always passes. */
  const hasPermission = (code: string): boolean => {
    if (isSystemManage) return true
    return permissions.includes(code)
  }

  /** OR semantics — true if the caller holds ANY of the given codes. `system:manage` always passes. This is the default/most common check. */
  const hasAnyPermission = (codes: string[]): boolean => {
    if (isSystemManage) return true
    return codes.some((code) => permissions.includes(code))
  }

  /** AND semantics — true only if the caller holds ALL of the given codes. `system:manage` always passes. */
  const hasAllPermissions = (codes: string[]): boolean => {
    if (isSystemManage) return true
    return codes.every((code) => permissions.includes(code))
  }

  /** Call after a successful login, or after api.ts's interceptor completes a silent refresh, to make sure this cached session reflects the current cookie. */
  const refetchSession = () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })

  /** Call on logout — clears the cached session immediately rather than waiting for a refetch to fail. */
  const clearSession = () => queryClient.setQueryData(SESSION_QUERY_KEY, undefined)

  return {
    // raw query state, for loading/error handling by callers.
    // isLoading is only true for the very first fetch attempt ever, not later
    // background refetches — use isSettled for "has it ever resolved at all".
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSettled: query.isFetched,
    isError: query.isError,
    error: query.error,

    // normalized session data — consumers destructure fields directly.
    session,
    permissions,
    isAuthenticated,
    isConfirmedUnauthenticated,

    // permission checks — the actual decisions worth centralizing
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // session lifecycle
    refetchSession,
    clearSession,
  }
}
