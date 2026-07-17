import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

// Lightweight, additive UI polish — NOT a security boundary. Real
// enforcement already happens server-side via the backend's own
// AuthorizeMiddleware; this just avoids flashing full page content at a
// user who holds none of the relevant permissions. Kept intentionally
// simple: an in-page conditional, not a router-level redirect/hard-block.
//
// While `usePermission()`'s underlying query is still loading, permissions
// are empty and `hasAnyPermission` would otherwise report false — render
// children optimistically during that window instead of flashing the
// denied message, since the real gate is server-side anyway.

interface AccessPermissionGateProps {
  /** Any one of these codes (or `system:manage`, handled inside usePermission) is enough to pass. Ignored if `allOf` is also given. */
  anyOf?: string[]
  /** ALL of these codes are required (or `system:manage`, handled inside usePermission). Takes precedence over `anyOf` if both are given. */
  allOf?: string[]
  children: ReactNode
}

const AccessPermissionGate = ({ anyOf, allOf, children }: AccessPermissionGateProps) => {
  const { hasAnyPermission, hasAllPermissions, isLoading } = usePermission()

  const isAllowed = allOf ? hasAllPermissions(allOf) : hasAnyPermission(anyOf ?? [])

  if (!isLoading && !isAllowed) {
    return (
      <div className="max-w-5xl">
        <div
          className="text-[13px] rounded-xl px-4 py-3 bg-danger-soft border border-danger text-danger"
        >
          You don't have permission to view this.
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AccessPermissionGate
