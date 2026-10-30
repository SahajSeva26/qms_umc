import queryClient from '@/lib/api/queryClient'
import { SESSION_QUERY_KEY } from '@/hooks/useSession'
import type { ApiResponse } from '@/types/common.types'
import type { SessionResponse } from '@/types/accessManagement.types'

/** Mirrors backend `authorizeMiddleware.ts` — a caller holding `system:manage` bypasses every check. */
const SYSTEM_MANAGE_CODE = 'system:manage'

// A route's `lazy:` function is a plain async function, not a component — it
// can't call usePermission()/useSession() (hooks). This reads the SAME
// cached GET /auth/me payload those hooks read (via the exact query key they
// use), so there is no second auth fetch and no parallel permission system —
// just a synchronous peek at data that's already there.
//
// This is a PERFORMANCE pre-check only, not a security/authorization
// decision: its only job is to decide whether it's worth calling import() to
// fetch a feature's chunk at all. RequirePermission (rendered by the route
// AFTER the chunk loads, unchanged and unbypassed) remains the real,
// authoritative frontend gate, and the backend's AuthorizeMiddleware
// permission-code checks remain the actual security boundary regardless of
// what this returns.
//
// Deliberately fails OPEN (returns true, i.e. "go ahead and load it") when
// the session hasn't resolved yet — e.g. a cold hard-reload landing directly
// on a deep link, before SessionBootstrap's GET /auth/me has settled. Failing
// closed there would risk skipping the chunk load for a genuinely authorized
// user during that race window; RequirePermission's own isSettled guard
// (features/../RequirePermission.tsx) is what actually protects against
// rendering unauthorized content while unsettled, so this pre-check only
// ever saves bytes — it never gates correctness.
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
