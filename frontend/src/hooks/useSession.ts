import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SessionResponse } from '@/types/accessManagement.types'

// The ONE central session hook. Owns the single GET /auth/me fetch that
// every permission/role check in the app is derived from — usePermission()
// and useActiveRole() are thin wrappers over this, not independent queries.
//
// Does NOT replace `useAuth`/`useAuthStore` (features/auth/store.ts) — that
// remains the existing 18-role frontend-only system gating the ~30 domain
// screens built before this real backend permission model existed. This
// hook is the new, additive, real-backend-permissions system living
// alongside it (see accessManagement.types.ts's header comment).
//
// Refresh-token orchestration lives in lib/api/api.ts's response
// interceptor, not here — a React hook can't intercept an arbitrary failed
// axios call made from outside a component, so the interceptor is the only
// place that can silently retry-after-refresh for every request app-wide,
// not just ones a component happens to make through this hook. This hook's
// job is narrower: once the interceptor has done its job (or the user logs
// in/out), make sure this cached session data gets invalidated/refetched
// so the UI is never showing stale permissions relative to the real cookie.

export const SESSION_QUERY_KEY = ['session'] as const

/** The exact backend bypass-all permission code (shared/env/permissions.ts SYSTEM.MANAGE.code). */
const SYSTEM_MANAGE_CODE = 'system:manage'

export const useSession = () => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => accessManagementService.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes — permissions rarely change mid-session
    // Never retry a 401 — it means "no valid session" (e.g. on first load
    // before any login, or after both tokens expire), which a retry can't
    // fix. Without this override, the queryClient's default retry:1 doubles
    // how long isLoading stays true on every unauthenticated load, and
    // SessionBootstrap blocks the entire router (including the login page
    // itself) until isLoading resolves.
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 1
    },
  })

  const session: SessionResponse | null = query.data?.data ?? null
  const permissions = session?.permissions ?? []

  const isAuthenticated = !!session

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
    // isLoading is ONLY true for this query's very FIRST fetch attempt ever
    // — it does NOT go true again for a later background refetch (e.g. a
    // second useSession() observer mounting and triggering its own
    // refetchOnMount). Consumers that need "has the session ever been
    // resolved at all, regardless of which fetch attempt did it" (like
    // AppLayout's hard-reload race) should use isSettled instead.
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSettled: query.isFetched,
    isError: query.isError,
    error: query.error,

    // normalized session data — consumers destructure what they need
    // directly (session.tenant.code, session.role.name, etc.) rather than
    // going through a getter-per-field; there's no behavior to encapsulate
    // in plain field access, only in the permission checks below.
    session,
    permissions,
    isAuthenticated,

    // permission checks — the actual decisions worth centralizing
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // session lifecycle
    refetchSession,
    clearSession,
  }
}
