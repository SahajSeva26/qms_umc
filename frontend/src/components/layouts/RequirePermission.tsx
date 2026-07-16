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
// General-purpose primitive: any route can wrap its element in this. Only
// wired onto the 4 access-management routes today (2026-07-16), since
// those are the only routes with real backend permission codes to check —
// see PROGRESS.md's "General-purpose route protection" note for how to
// extend this to other features once/if they get real permission codes.

interface RequirePermissionProps {
  /** Any one of these codes (or `system:manage`) is enough to pass. Ignored if `allOf` is also given. */
  anyOf?: string[]
  /** ALL of these codes are required (or `system:manage`). Takes precedence over `anyOf` if both are given. */
  allOf?: string[]
  children: ReactNode
}

const RequirePermission = ({ anyOf, allOf, children }: RequirePermissionProps) => {
  const { hasAnyPermission, hasAllPermissions, isLoading } = usePermission()

  // While the session is still loading, render nothing yet rather than
  // redirecting prematurely — a real user with permission should never be
  // bounced to /unauthorized just because the session query hasn't resolved.
  if (isLoading) return null

  const isAllowed = allOf ? hasAllPermissions(allOf) : hasAnyPermission(anyOf ?? [])

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default RequirePermission
