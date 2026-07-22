import type { IPermission } from '@/types/accessManagement.types'

// Hardcoded mirror of the REAL backend permission catalog
// (`backend/src/shared/env/permissions.ts` -> PERMISSIONS / PERMISSIONS_ARRAY),
// assembled from the six resource `*.constants.ts` files it aggregates:
//   - shared/env/permissions.ts               (SYSTEM_PERMISSIONS)
//   - modules/user/user.constants.ts                                   (USER_PERMISSIONS)
//   - modules/access-management/tenant/tenant.constants.ts             (TENANT_PERMISSIONS)
//   - modules/access-management/permission-group/permissionGroup.constants.ts (PERMISSION_GROUP_PERMISSIONS)
//   - modules/access-management/role-type/roleType.constants.ts        (ROLE_TYPE_PERMISSIONS)
//   - modules/access-management/role/role.constants.ts                 (ROLE_PERMISSIONS)
//
// There is no dedicated "list all permissions" endpoint on the backend, so
// this catalog is hardcoded here to power the permission-group "shopping
// cart" UI: every known permission code is always rendered, grouped by
// resource, with the ones already on the group checked. 27 codes total
// across 6 resources — kept in exact sync with the backend source above.
//
// Shape deliberately mirrors the backend's own PERMISSIONS object exactly —
// an object keyed by resource, each resource an object keyed by action name
// (e.g. PERMISSIONS.TENANT.CREATE) — rather than the array-of-groups shape
// this file used before. The backend never represents this as an array;
// SYSTEM having only one action (MANAGE) is just a one-key object there, not
// a special case, so there's no array-of-one to flatten here either.

export interface PermissionResourceLabel {
  /** Display label for the resource group header, e.g. 'Permission Group'. */
  label: string
}

export const PERMISSION_CATALOG = {
  SYSTEM: {
    MANAGE: { code: 'system:manage', name: 'Manage System', description: 'Manage system' },
  },
  USER: {
    CREATE: { code: 'user:create', name: 'Create User', description: 'Create a new user' },
    GET: { code: 'user:get', name: 'Get User', description: 'Get a user' },
    SEARCH: { code: 'user:search', name: 'Search User', description: 'Search users' },
    UPDATE: { code: 'user:update', name: 'Update User', description: 'Update a user' },
    MANAGE: { code: 'user:manage', name: 'Manage User', description: 'Manage users' },
  },
  TENANT: {
    CREATE: { code: 'tenant:create', name: 'Create Tenant', description: 'Create a new tenant' },
    GET: { code: 'tenant:get', name: 'Get Tenant', description: 'Get a tenant' },
    SEARCH: { code: 'tenant:search', name: 'Search Tenant', description: 'Search tenants' },
    UPDATE: { code: 'tenant:update', name: 'Update Tenant', description: 'Update a tenant' },
    ADMIN: { code: 'tenant:admin', name: 'Admin Tenant', description: 'Admin tenant' },
    MANAGE: { code: 'tenant:manage', name: 'Manage Tenant', description: 'Manage tenants' },
  },
  PERMISSION_GROUP: {
    CREATE: { code: 'permission-group:create', name: 'Create Permission Group', description: 'Create Permission Group' },
    GET: { code: 'permission-group:get', name: 'Get Permission Group', description: 'Get Permission Group' },
    SEARCH: { code: 'permission-group:search', name: 'Search Permission Group', description: 'Search Permission Group' },
    UPDATE: { code: 'permission-group:update', name: 'Update Permission Group', description: 'Update Permission Group' },
    MANAGE: { code: 'permission-group:manage', name: 'Manage Permission Group', description: 'Manage Permission Group' },
  },
  ROLE_TYPE: {
    GET: { code: 'role-type:get', name: 'Get Role Type', description: 'Get Role Type' },
    SEARCH: { code: 'role-type:search', name: 'Search Role Type', description: 'Search Role Type' },
    CREATE: { code: 'role-type:create', name: 'Create Role Type', description: 'Create Role Type' },
    UPDATE: { code: 'role-type:update', name: 'Update Role Type', description: 'Update Role Type' },
    MANAGE: { code: 'role-type:manage', name: 'Manage Role Type', description: 'Manage Role Type' },
  },
  ROLE: {
    GET: { code: 'role:get', name: 'Get Role', description: 'Get Role' },
    SEARCH: { code: 'role:search', name: 'Search Role', description: 'Search Role' },
    CREATE: { code: 'role:create', name: 'Create Role', description: 'Create Role' },
    UPDATE: { code: 'role:update', name: 'Update Role', description: 'Update Role' },
    MANAGE: { code: 'role:manage', name: 'Manage Role', description: 'Manage Role' },
  },
} as const

/** Display labels for each resource group header — keys must match PERMISSION_CATALOG exactly. */
export const PERMISSION_RESOURCE_LABELS: Record<keyof typeof PERMISSION_CATALOG, string> = {
  SYSTEM: 'System',
  USER: 'User',
  TENANT: 'Tenant',
  PERMISSION_GROUP: 'Permission Group',
  ROLE_TYPE: 'Role Type',
  ROLE: 'Role',
}

/** Flat list of every catalog permission, in the same order as PERMISSION_CATALOG's keys. */
export const PERMISSION_CATALOG_FLAT: IPermission[] = Object.values(PERMISSION_CATALOG).flatMap((resource) =>
  Object.values(resource),
)
