import queryClient from '@/lib/api/queryClient'
import { SESSION_QUERY_KEY } from '@/hooks/useSession'
import type { ApiResponse, SessionResponse } from '@qms/core'

const SYSTEM_MANAGE_CODE = 'system:manage'

// Performance pre-check only (skip import() if RequirePermission would redirect anyway) —
// RequirePermission remains the real gate; fails open (null) until the session settles.
function getCachedSessionPermissions(): string[] | null {
  const cached = queryClient.getQueryData<ApiResponse<SessionResponse>>(SESSION_QUERY_KEY)
  const permissions = cached?.data?.permissions
  return permissions ?? null
}

/** OR semantics, matching RequirePermission's `anyOf` / useSession's hasAnyPermission. */
export function hasAnyPermissionHint(codes: string[]): boolean {
  const permissions = getCachedSessionPermissions()
  if (permissions === null) return true
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  return codes.some((code) => permissions.includes(code))
}
