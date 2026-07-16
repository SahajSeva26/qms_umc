import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SessionPermissions } from '@/types/accessManagement.types'

// NEW, independent hook. Does NOT replace `useAuth`/`useAuthStore` and does
// NOT modify `useLogin.ts` or the auth store — this is the only place that
// calls GET /auth/me, wired through its own TanStack Query key so it never
// interferes with the existing login flow.

/** The exact backend bypass-all permission code (shared/env/permissions.ts SYSTEM.MANAGE.code). */
const SYSTEM_MANAGE_CODE = 'system:manage'

export const SESSION_PERMISSIONS_QUERY_KEY = ['session-permissions'] as const

export const usePermission = () => {
  const query = useQuery({
    queryKey: SESSION_PERMISSIONS_QUERY_KEY,
    queryFn: () => accessManagementService.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes — permissions rarely change mid-session
  })

  const session = query.data?.data ?? null
  const permissions = session?.permissions ?? []

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
    for (const code of codes) {
      if (permissions.includes(code)) return true
    }
    return false
  }

  /** AND semantics — true only if the caller holds ALL of the given codes. `system:manage` always passes. */
  const hasAllPermissions = (codes: string[]): boolean => {
    if (isSystemManage) return true
    for (const code of codes) {
      if (!permissions.includes(code)) return false
    }
    return true
  }

  const sessionPermissions: SessionPermissions | null = session
    ? {
        permissions,
        roleCode: session.role.code,
        roleTypeCode: session.roleType.code,
        roleTypeId: session.roleType.id,
        tenantCode: session.tenant.code,
        tenantType: session.tenant.type,
        tenantId: session.tenant.id,
      }
    : null

  return {
    // raw query state, for loading/error handling by callers
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // raw session payload, for display purposes
    session,
    sessionPermissions,
    permissions,

    // permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
