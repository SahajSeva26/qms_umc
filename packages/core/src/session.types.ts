export type TenantType = 'platform' | 'customer'

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
  // Division id when the role is division-restricted (e.g. Pharma Division Head); null when the
  // role has no division, absent only if the backend response predates this field.
  division?: string | null
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

/** Flattened, display-friendly projection of SessionResponse. */
export interface SessionPermissions {
  permissions: string[]
  roleCode: string
  roleTypeCode: string
  roleTypeId: string
  tenantCode: string
  tenantType: TenantType
  tenantId: string
}
