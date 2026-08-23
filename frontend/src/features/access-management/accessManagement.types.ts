// Shared types for the PBAC (permission-based access control) domain —
// reflects the REAL backend permission model returned by GET /auth/me,
// keyed on permission code strings like 'user:get', 'tenant:manage', etc.
// Decoupled from `@/features/auth/auth.types.ts`'s separate frontend-only UserRole system.

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

// Fields below `name` are optional: only present when the caller holds `system:manage`.
export interface Tenant {
  id: string
  code: string
  name: string
  status?: TenantStatus
  owner?: string
  createdAt?: string
  updatedAt?: string
  type?: TenantType
  // Raw Role id (never populated), same system:manage-only gate. Optional
  // server-side (default null) — required on create here per direct
  // instruction, pending a backend decision on sales-rep vs sales-head.
  salesPerson?: string | null
}

export interface SearchTenantQuery {
  name?: string
  code?: string
  // No permission gate on this filter (backend's own TODO to add one) —
  // any caller can filter by type even though it's only visible in the
  // response to a system:manage caller.
  type?: TenantType
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
  // Role id, must be type 'sales-rep'. Optional on the backend; required
  // here per direct instruction — TODO: revisit once the backend settles
  // on sales-rep vs sales-head.
  salesPerson: string
}

export interface UpdateTenantPayload {
  name?: string
  description?: string
  // Only takes effect server-side if caller has `tenant:manage`; silently ignored otherwise.
  status?: TenantStatus
  // Only takes effect server-side if caller has `system:manage`; silently ignored otherwise.
  type?: TenantType
  // Role id, or null to unassign — same 'sales-rep' RoleType constraint as create.
  salesPerson?: string | null
}

// ---------------------------------------------------------------------------
// PermissionGroup
// ---------------------------------------------------------------------------

export type PermissionGroupStatus = 'active' | 'inactive'

// Named Entity to avoid a name clash with an existing `PermissionGroup` identifier elsewhere.
// Fields below `updatedAt` are optional: only present for a system:manage/tenant:admin caller.
export interface PermissionGroupEntity {
  id: string
  code: string
  name: string
  description: string
  tenant: string
  createdAt: string
  updatedAt: string
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

// Mirrors ALLOWED_ROLETYPE_CODES (roleType.constants.ts) — the backend's own
// code field is a free-form regex, this type just lists the known set.
export type RoleTypeCode =
  | 'system'
  | 'hr'
  | 'admin'
  | 'sales-rep'
  | 'sales-head'
  | 'camp-coordinator-screening'
  | 'camp-coordinator-diet'
  | 'operation-manager-screening'
  | 'operation-manager-diet'
  | 'field-officer'
  | 'pharma-division-head'
  | 'pharma-asm'
  | 'pharma-rsm'
  | 'pharma-mr'

// Populated on GET (search) only — GET-by-id returns a bare ObjectId string
// instead, hence the union on RoleTypeEntity.tenant below.
export interface RoleTypePopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface RoleTypeEntity {
  id: string
  code: string
  name: string
  description: string
  // Bare permission-code strings, not expanded {code,name,description}
  // objects (that expansion only happens for PermissionGroup.permissions).
  permissions: string[]
  // Populated {RoleTypePopulatedTenant} on GET (search); raw ObjectId string
  // on GET-by-id/create/update responses — see RoleTypePopulatedTenant's comment.
  tenant: RoleTypePopulatedTenant | string
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

// Nested populated relations (type/user/tenant below) pass through
// Mongoose's raw .populate() output untouched, so they carry `_id`, not the
// mapped `id` — only present on GET-by-id/search, not create/update.

/** Populated shape for `type` as returned by GET-by-id/search. */
export interface RolePopulatedRoleType {
  _id?: string
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
  _id?: string
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
  // Bare permission-code strings — see the same note on RoleTypeEntity.permissions.
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
  /** Division id */
  division?: string
  /** Supervisor Role id */
  supervisor?: string
  // Free-text keyword matched against the linked user's first/last name or
  // email (role.service.ts's search(), 2026-07-27) — NOT a user id despite
  // the field name. Built for a member-picker typeahead.
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
  /** Division id — required server-side for non-admin roles on a customer tenant */
  division?: string
  /** Supervisor Role id — required server-side per ROLE_SUPERVISOR_TREE */
  supervisor?: string
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
  /** Division id */
  division?: string
  /** Supervisor Role id */
  supervisor?: string
  user?: UpdateRoleUserPayload
}

