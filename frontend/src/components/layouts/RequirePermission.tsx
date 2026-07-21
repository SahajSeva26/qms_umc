import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

// Route-level permission guard — redirects to /unauthorized if the current
// user lacks the required permission(s), instead of rendering the route's
// element at all. This is a REAL access-control boundary at the route level
// (unlike AccessPermissionGate, which is in-page UI polish only) — but the
// actual, load-bearing enforcement is still the backend's own
// AuthorizeMiddleware; this exists so a user without permission never even
// sees the page's content flash before a redirect, and gets a clear,
// dedicated "why can't I see this" destination instead of a broken/empty
// screen.
//
// General-purpose primitive: any route can wrap its element in this. Wired
// onto the 4 access-management routes plus Company Data/Divisions and CRM
// (crm.routes.tsx) so far, since those are the routes with real backend
// permission codes to check — see PROGRESS.md's "General-purpose route
// protection" note for how to extend this to other features once/if they
// get real permission codes.

interface RequirePermissionProps {
  /** Any one of these codes (or `system:manage`) is enough to pass. Ignored if `allOf` is also given. */
  anyOf?: string[]
  /** ALL of these codes are required (or `system:manage`). Takes precedence over `anyOf` if both are given. */
  allOf?: string[]
  /**
   * When true, `system:manage` does NOT bypass this gate — only an explicit
   * `anyOf`/`allOf` code passes. Use for features that are deliberately
   * tenant-scoped-only (e.g. Company Data/Divisions: a customer tenant's own
   * business, not something QMS's platform-level super-admin should reach)
   * where the normal "system:manage sees everything" rule would be wrong.
   * Defaults to false (normal bypass semantics) everywhere else, matching
   * the backend's own AuthorizeMiddleware default.
   */
  excludeSystemManage?: boolean
  children: ReactNode
}

const RequirePermission = ({ anyOf, allOf, excludeSystemManage, children }: RequirePermissionProps) => {
  const { hasAnyPermission, hasAllPermissions, permissions, isSettled } = usePermission()

  // Wait until the session query has resolved at least once before deciding
  // to redirect — a real user with permission should never be bounced to
  // /unauthorized just because the session hasn't loaded yet. Uses isSettled
  // (true once the query has completed ANY fetch, initial or a later
  // refetch), not isLoading (only true for the very first-ever fetch) —
  // isLoading would incorrectly read false during a later refetch (e.g.
  // right after refetchSession() invalidates the query on login), letting
  // this guard proceed on stale/empty permission data before the refetch
  // actually completes.
  if (!isSettled) return null

  // Raw permissions.includes(...) — deliberately bypassing hasAnyPermission/
  // hasAllPermissions' own system:manage shortcut, which is exactly what
  // excludeSystemManage exists to opt out of. Same raw-check pattern already
  // used for Sidebar.tsx's PERMISSION_NAV_SECTIONS, for the same reason.
  const isAllowed = excludeSystemManage
    ? allOf
      ? allOf.every((code) => permissions.includes(code))
      : (anyOf ?? []).some((code) => permissions.includes(code))
    : allOf
      ? hasAllPermissions(allOf)
      : hasAnyPermission(anyOf ?? [])

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default RequirePermission
