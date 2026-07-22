// Shared types for the PBAC (permission-based access control) domain.
//
// This is a purely additive, NEW type module. It does not replace or touch
// `@/types/auth.types.ts` (the existing 18-role frontend-only enum system).
// The two systems are intentionally decoupled:
//   - auth.types.ts / useAuth.ts gate the existing ~30 domain screens via
//     invented frontend-only UserRole strings with no backend counterpart.
//   - accessManagement.types.ts / usePermission.ts (below) reflect the REAL backend
//     permission model returned by GET /auth/me, keyed on permission code
//     strings like 'user:get', 'tenant:manage', etc.

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

/** A single permission as it appears embedded inside a PermissionGroup/RoleType/Role's `permissions` array. */
export interface IPermission {
  code: string
  name: string
  description: string
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export type TenantType = 'platform' | 'customer'
export type TenantStatus = 'active' | 'inactive'

/**
 * Tenant entity shape.
 * NOTE: per backend TenantMapper.toResponse, `status`/`owner`/`createdAt`/
 * `updatedAt`/`type` are only present when the caller holds `system:manage`.
 * For all other authorized callers, only {id, code, name} come back.
 * These extra fields are typed optional to reflect that gap honestly.
 */
export interface Tenant {
  id: string
  code: string
  name: string
  // TODO: only present server-side if caller has `system:manage` (TenantMapper.toResponse gate).
  status?: TenantStatus
  owner?: string
  createdAt?: string
  updatedAt?: string
  type?: TenantType
}

export interface SearchTenantQuery {
  name?: string
  code?: string
  // TODO: only honored server-side if caller has `tenant:manage`; otherwise search is hard-scoped to status=active.
  status?: TenantStatus
  page?: string
  limit?: string
}

export interface RegisterOwnerPayload {
  firstName: string
  lastName?: string
  email: string
  password: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
}

export interface CreateTenantPayload {
  code: string
  name: string
  description?: string
  owner: RegisterOwnerPayload
}

export interface UpdateTenantPayload {
  name?: string
  description?: string
  // Only takes effect server-side if caller has `tenant:manage`; silently ignored otherwise.
  status?: TenantStatus
  // Only takes effect server-side if caller has `system:manage`; silently ignored otherwise.
  type?: TenantType
}

// ---------------------------------------------------------------------------
// PermissionGroup
// ---------------------------------------------------------------------------

export type PermissionGroupStatus = 'active' | 'inactive'

/**
 * Named `PermissionGroupEntity` (not `PermissionGroup`) to avoid any name
 * clash with an existing `PermissionGroup` identifier elsewhere in the app.
 *
 * NOTE: per backend PermissionGroupMapper, `status`/`permissions` are only
 * present when the caller holds `system:manage` OR `tenant:admin`; everyone
 * else gets just {id, code, name, description, tenant, createdAt, updatedAt}.
 */
export interface PermissionGroupEntity {
  id: string
  code: string
  name: string
  description: string
  tenant: string
  createdAt: string
  updatedAt: string
  // TODO: only present server-side if caller has `system:manage` or `tenant:admin` (mapper gate).
  status?: PermissionGroupStatus
  permissions?: IPermission[]
}

export interface SearchPermissionGroupQuery {
  name?: string
  code?: string
  status?: PermissionGroupStatus
  tenant?: string
  page?: string
  limit?: string
}

// TODO: backend POST /permission-groups route is currently commented out /
// disabled (no live create endpoint) — this payload type documents the
// schema (CreatePermissionGroupPayloadSchema) for when/if it's re-enabled.
export interface CreatePermissionGroupPayload {
  code: string
  name: string
  description: string
  tenant: string
  permissions?: IPermission[]
}

export interface UpdatePermissionGroupPayload {
  name?: string
  description?: string
  status?: PermissionGroupStatus
  permissions?: IPermission[]
}

// ---------------------------------------------------------------------------
// RoleType
// ---------------------------------------------------------------------------

export type RoleTypeStatus = 'active' | 'inactive'

/** The fixed, backend-enforced set of allowed RoleType codes (ALLOWED_ROLETYPE_CODES_ARRAY). */
export type RoleTypeCode =
  | 'system'
  | 'hr'
  | 'admin'
  | 'sales'
  | 'sales-head'
  | 'pharma-ho'
  | 'pharma-ms'
  | 'pharms-asm'
  | 'pharma-rsm'

export interface RoleTypeEntity {
  id: string
  code: string
  name: string
  description: string
  // Backend `roleType.model.ts` stores `permissions` as `[{ type: String }]`
  // and `RoleTypeMapper.toResponse` passes it through untouched — this is a
  // bare array of permission-code strings, NOT expanded {code,name,description}
  // objects (that expansion only happens for PermissionGroup.permissions).
  permissions: string[]
  tenant: string
  createdAt: string
  updatedAt: string
  // TODO: gated on caller having `tenant:admin`/`tenant:manage` in the mapper;
  // in practice always present through the current router since every route
  // guard already requires one of those two permissions.
  status?: RoleTypeStatus
}

export interface SearchRoleTypeQuery {
  name?: string
  code?: string
  status?: RoleTypeStatus
  tenant?: string
  page?: string
  limit?: string
}

export interface CreateRoleTypePayload {
  code: RoleTypeCode
  name: string
  description?: string
  tenant: string
  permissions?: string[]
}

export interface UpdateRoleTypePayload {
  name?: string
  description?: string
  permissions?: string[]
  status?: RoleTypeStatus
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export type RoleStatus = 'active' | 'inactive'

/** Populated shape for `type`/`user`/`tenant` as returned by GET-by-id/search (not create/update, which return raw ObjectIds). */
export interface RolePopulatedRoleType {
  id?: string
  name: string
  code: string
  // Bare permission-code strings — see the same note on RoleTypeEntity.permissions.
  permissions?: string[]
}

export interface RolePopulatedUser {
  firstName: string
  lastName?: string
  email: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  status?: string
}

export interface RolePopulatedTenant {
  id?: string
  name: string
  code: string
  type?: TenantType
  status?: TenantStatus
}

export interface RoleEntity {
  id: string
  code: string
  name: string
  description?: string
  // Backend `role.model.ts` stores `permissions` as `[{ type: String }]` and
  // `RoleMapper.toResponse` passes it through untouched — bare permission-code
  // strings, NOT expanded {code,name,description} objects.
  permissions: string[]
  status: RoleStatus
  // Populated {RolePopulatedRoleType} on GET-by-id/search; raw ObjectId string on create/update responses.
  type: RolePopulatedRoleType | string
  // Populated {RolePopulatedUser} on GET-by-id/search; raw ObjectId string on create/update responses.
  user: RolePopulatedUser | string
  // Populated {RolePopulatedTenant} on GET-by-id/search; raw ObjectId string on create/update responses.
  tenant: RolePopulatedTenant | string
  createdAt: string
  updatedAt: string
}

export interface SearchRoleQuery {
  name?: string
  code?: string
  status?: RoleStatus
  tenant?: string
  /** RoleType id */
  type?: string
  /** User id */
  user?: string
  page?: string
  limit?: string
}

export interface CreateRolePayload {
  code: string
  name: string
  description?: string
  permissions?: string[]
  /** RoleType id */
  type: string
  /** Tenant id */
  tenant: string
  user: RegisterOwnerPayload
}

export interface UpdateRoleUserPayload {
  firstName?: string
  lastName?: string
  status?: 'active' | 'inactive' | 'suspended' | 'deleted'
  gender?: 'male' | 'female' | 'other'
}

export interface UpdateRolePayload {
  name?: string
  description?: string
  permissions?: string[]
  status?: RoleStatus
  /** RoleType id */
  type?: string
  user?: UpdateRoleUserPayload
}

// ---------------------------------------------------------------------------
// Session (GET /auth/me)
// ---------------------------------------------------------------------------

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
