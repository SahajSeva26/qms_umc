// Shared types for the PBAC domain — reflects the real backend permission
// model (GET /auth/me), decoupled from auth.types.ts's frontend-only UserRole system.

import type { LocationValue } from '@/types/location.types'

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

/** Shape of a permission inside PermissionGroup's `permissions` array only —
 * RoleType/Role hold bare code strings instead (see their own comments). */
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

// Only present when the search was called with report=true (see SearchTenantQuery.report) —
// a per-tenant rollup for the current result page only.
export interface TenantStats {
  totalProjects: number
  liveProjects: number
  totalCamps: number
  liveCamps: number
  screeningCamps: number
  dietCamps: number
}

// Fields below `name` (except `address`) are optional: only present when the caller holds
// `system:manage`. `address` is NOT gated — returned unconditionally for every caller.
export interface Tenant {
  id: string
  code: string
  name: string
  address: LocationValue | null
  // Optional business age/lifetime in years, and GST registration number
  // (GSTIN, format-validated server-side). Both `?? null` on the mapper.
  businessLifetime: number | null
  gst: string | null
  status?: TenantStatus
  owner?: string
  createdAt?: string
  updatedAt?: string
  type?: TenantType
  // Raw Role id, same system:manage-only gate. Optional server-side —
  // required here per direct instruction, pending sales-rep vs sales-head decision.
  salesPerson?: string | null
  stats?: TenantStats
}

export interface SearchTenantQuery {
  name?: string
  code?: string
  // No permission gate on this filter (backend's own TODO to add one) —
  // any caller can filter by type even though only system:manage sees it in the response.
  type?: TenantType
  // TODO: only honored server-side if caller has `tenant:manage`; otherwise search is hard-scoped to status=active.
  status?: TenantStatus
  page?: string
  limit?: string
  // When 'true', each item gets a `stats` object (see TenantStats). Backend
  // caps `limit` to 20 when this is set — a bigger page 400s.
  report?: 'true' | 'false'
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
  owner: RegisterOwnerPayload
  // Role id, must be type 'sales-rep'. Optional on the backend; required
  // here per direct instruction — TODO: revisit once sales-rep vs sales-head settles.
  salesPerson: string
  address?: LocationValue
  businessLifetime?: number
  gst?: string
}

export interface UpdateTenantPayload {
  name?: string
  // Only takes effect server-side if caller has `tenant:manage`; silently ignored otherwise.
  status?: TenantStatus
  // Currently a no-op server-side — tenant.service.ts's set() has this update path commented out entirely.
  type?: TenantType
  // Role id, or null to unassign — same 'sales-rep' RoleType constraint as create.
  salesPerson?: string | null
  // Optional, replace-wholesale — omitting it preserves whatever address the tenant already has.
  address?: LocationValue
  businessLifetime?: number
  gst?: string
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

// TODO: backend POST /permission-groups route is currently disabled — this
// type documents CreatePermissionGroupPayloadSchema for when it's re-enabled.
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
  // TODO: gated on `tenant:admin`/`tenant:manage` in the mapper; in practice
  // always present since every route guard already requires one of those two.
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

// Nested populated relations pass through Mongoose's raw .populate() output
// untouched, so they carry `_id` (not mapped `id`) — GET-by-id/search only.

/** Populated shape for `type` as returned by GET-by-id/search. */
export interface RolePopulatedRoleType {
  _id?: string
  name: string
  code: string
  // Bare permission-code strings — see the same note on RoleTypeEntity.permissions.
  permissions?: string[]
}

export interface RolePopulatedUser {
  // Mongoose's .populate() always includes _id unless explicitly excluded — role.service.ts's
  // populate select ('firstName lastName email phone gender status') doesn't exclude it.
  _id?: string
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
  // Populated {RolePopulatedRoleType} on GET-by-id/search; raw ObjectId string on
  // create/update responses; `null` when the referenced RoleType was deleted.
  type: RolePopulatedRoleType | string | null
  // Populated {RolePopulatedUser} on GET-by-id/search; raw ObjectId string on create/update responses;
  // `null` when the referenced User was deleted (Mongoose resolves a dangling populate to `null`).
  user: RolePopulatedUser | string | null
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
  // Free-text keyword matched against the linked user's name/email — NOT a
  // user id despite the field name. Built for a member-picker typeahead.
  user?: string
  page?: string
  limit?: string
}

// GET /roles/mrs — the caller's own downline MRs (pharma HO/RSM/ASM only,
// enforced server-side). `name` matches the linked user's name/email, not the role's own name.
export interface SearchDownlineMrQuery {
  name?: string
  page?: string
  limit?: string
}

export interface CreateRolePayload {
  /** Optional — the backend auto-generates one for pharma field-force roles
   * (MR/ASM/RSM) when omitted; every other role type still requires it. */
  code?: string
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

/** Flattened, display-friendly projection of SessionResponse used by
 * usePermission()/useActiveRole(), so callers don't reach into nested objects. */
export interface SessionPermissions {
  permissions: string[]
  roleCode: string
  roleTypeCode: string
  roleTypeId: string
  tenantCode: string
  tenantType: 'platform' | 'customer'
  tenantId: string
}

// ---------------------------------------------------------------------------
// Employee — HR/staff-registry record layered on top of a User+Role, currently scoped to Field
// Officers only. Gated by role-TYPE (RoleGuard), not permission codes — see employeeAccess.ts.
// ---------------------------------------------------------------------------

export type EmployeeStatus = 'active' | 'inactive' | 'terminated'
export type EmployeeType = 'field-officer'
export type EmployeeGender = 'male' | 'female' | 'other'
export type DaRuleType = 'fixed' | 'percentage'

export interface EmployeePopulatedTenant {
  _id?: string
  name: string
  code: string
  type?: TenantType
}

export interface EmployeePopulatedUser {
  _id?: string
  firstName: string
  lastName?: string
  email: string
  phone?: string
  avatar?: { url: string; id: string }
  status?: string
}

export interface EmployeePopulatedSupervisor {
  _id?: string
  email: string
  type?: EmployeeType
  status?: EmployeeStatus
  profile?: EmployeeProfile
}

export interface DaRule {
  type: DaRuleType
  value: number
}

export interface BankDetails {
  accountHolderName?: string
  accountNumber?: string
  ifscCode?: string
  bankName?: string
  branch?: string
}

export interface EmployeeProfilePicture {
  url?: string
  thumbnail?: string
}

export interface EmployeeProfile {
  firstName?: string
  lastName?: string
  profilePicture?: EmployeeProfilePicture
  dob?: string | null
  fatherName?: string
  bloodGroup?: string
  gender?: EmployeeGender
}

export interface EmployeeEntity {
  id: string
  // Populated {EmployeePopulatedTenant} on GET-by-id/search; raw ObjectId string on create/update responses.
  tenant: EmployeePopulatedTenant | string
  // Populated {EmployeePopulatedUser} on GET-by-id/search; raw ObjectId string on create/update responses.
  user: EmployeePopulatedUser | string
  email: string
  phone: string
  type: EmployeeType
  doj: string
  dol?: string
  reason?: string
  profile?: EmployeeProfile
  salary?: number
  daRule?: DaRule
  aadharNumber?: string
  panNumber?: string
  bankDetails?: BankDetails
  location?: LocationValue
  // Populated {EmployeePopulatedSupervisor} on GET-by-id/search; raw ObjectId string on create/update responses; null when unset.
  supervisor?: EmployeePopulatedSupervisor | string | null
  status: EmployeeStatus
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SearchEmployeeQuery {
  name?: string
  email?: string
  type?: EmployeeType
  status?: EmployeeStatus
  tenant?: string
  supervisor?: string
  user?: string
  page?: string
  limit?: string
}

// No `supervisor` field surfaced this pass — deferred (see the Employee wiring plan).
export interface CreateEmployeePayload {
  /** Id of an existing User — the backend has no combined create-User+Employee endpoint. */
  user: string
  email: string
  phone: string
  type: EmployeeType
  doj: string
  dol?: string
  reason?: string
  profile?: EmployeeProfile
  /** Platform actors must supply; customer actors are pinned to their own tenant. */
  tenant?: string
  status?: EmployeeStatus
  salary?: number
  daRule?: DaRule
  aadharNumber?: string
  panNumber?: string
  bankDetails?: BankDetails
  location?: LocationValue
  meta?: Record<string, unknown>
}

// tenant/user/email are identity — immutable via update (omitted from the backend's own update schema).
export interface UpdateEmployeePayload {
  phone?: string
  type?: EmployeeType
  doj?: string
  dol?: string
  reason?: string
  profile?: EmployeeProfile
  status?: EmployeeStatus
  salary?: number
  daRule?: DaRule
  aadharNumber?: string
  panNumber?: string
  /** Replaced wholesale server-side when supplied — never deep-merged. */
  bankDetails?: BankDetails
  /** Replaced wholesale server-side when supplied — never deep-merged. */
  location?: LocationValue
  meta?: Record<string, unknown>
}
