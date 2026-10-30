import { useSession, SESSION_QUERY_KEY } from '@/hooks/useSession'
import type { SessionPermissions } from '@/types/accessManagement.types'

// Thin wrapper over the central `useSession()` hook — kept as its own export
// (rather than migrating call sites to useSession directly) so existing
// consumers (RequirePermission.tsx, TenantDetailPage.tsx) don't need to
// change. New code should prefer `useSession()` directly.
export { SESSION_QUERY_KEY as SESSION_PERMISSIONS_QUERY_KEY }

export const usePermission = () => {
  const {
    isLoading,
    isFetching,
    isSettled,
    isError,
    error,
    isConfirmedUnauthenticated,
    session,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetchSession,
  } = useSession()

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
    // isLoading is only true for the very first fetch; use isSettled to
    // check "has the session ever resolved".
    isLoading,
    isFetching,
    isSettled,
    isError,
    error,
    isConfirmedUnauthenticated,
    refetch: refetchSession,

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
