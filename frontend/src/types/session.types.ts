import type { TenantType } from '@/features/access-management/accessManagement.types'

// Session types — the shape of GET /auth/me's response, consumed by the
// global session/auth infrastructure (useSession, usePermission,
// useActiveRole, lib/auth/lazyPermissionHint). Split out of
// accessManagement.types.ts — these are application-wide session
// primitives, not Access Management domain types.

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: { url: string; id: string }
}

export interface SessionRole {
  id: string
  code: string
  name: string
}

export interface SessionRoleType {
  id: string
  code: string
  name: string
}

export interface SessionTenant {
  id: string
  code: string
  name: string
  type: TenantType
}

/** Raw shape of the `data` payload from GET /auth/me. */
export interface SessionResponse {
  user: SessionUser
  role: SessionRole
  roleType: SessionRoleType
  tenant: SessionTenant
  permissions: string[]
}

/**
 * Flattened, display-friendly projection of SessionResponse used by
 * usePermission()/useActiveRole(). Distinct from SessionResponse so callers
 * needing individual scalars don't have to reach into nested objects.
 */
export interface SessionPermissions {
  permissions: string[]
  roleCode: string
  roleTypeCode: string
  roleTypeId: string
  tenantCode: string
  tenantType: 'platform' | 'customer'
  tenantId: string
}
