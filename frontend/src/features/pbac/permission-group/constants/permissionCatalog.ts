import type { IPermission } from '@/types/pbac.types'

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

export interface PermissionCatalogGroup {
  /** Resource key, e.g. 'system', 'user', 'tenant'. */
  resource: string
  /** Display label for the resource group header. */
  label: string
  permissions: IPermission[]
}

export const PERMISSION_CATALOG: PermissionCatalogGroup[] = [
  {
    resource: 'system',
    label: 'System',
    permissions: [
      { code: 'system:manage', name: 'Manage System', description: 'Manage system' },
    ],
  },
  {
    resource: 'user',
    label: 'User',
    permissions: [
      { code: 'user:create', name: 'Create User', description: 'Create a new user' },
      { code: 'user:get', name: 'Get User', description: 'Get a user' },
      { code: 'user:search', name: 'Search User', description: 'Search users' },
      { code: 'user:update', name: 'Update User', description: 'Update a user' },
      { code: 'user:manage', name: 'Manage User', description: 'Manage users' },
    ],
  },
  {
    resource: 'tenant',
    label: 'Tenant',
    permissions: [
      { code: 'tenant:create', name: 'Create Tenant', description: 'Create a new tenant' },
      { code: 'tenant:get', name: 'Get Tenant', description: 'Get a tenant' },
      { code: 'tenant:search', name: 'Search Tenant', description: 'Search tenants' },
      { code: 'tenant:update', name: 'Update Tenant', description: 'Update a tenant' },
      { code: 'tenant:admin', name: 'Admin Tenant', description: 'Admin tenant' },
      { code: 'tenant:manage', name: 'Manage Tenant', description: 'Manage tenants' },
    ],
  },
  {
    resource: 'permission-group',
    label: 'Permission Group',
    permissions: [
      { code: 'permission-group:create', name: 'Create Permission Group', description: 'Create Permission Group' },
      { code: 'permission-group:get', name: 'Get Permission Group', description: 'Get Permission Group' },
      { code: 'permission-group:search', name: 'Search Permission Group', description: 'Search Permission Group' },
      { code: 'permission-group:update', name: 'Update Permission Group', description: 'Update Permission Group' },
      { code: 'permission-group:manage', name: 'Manage Permission Group', description: 'Manage Permission Group' },
    ],
  },
  {
    resource: 'role-type',
    label: 'Role Type',
    permissions: [
      { code: 'role-type:get', name: 'Get Role Type', description: 'Get Role Type' },
      { code: 'role-type:search', name: 'Search Role Type', description: 'Search Role Type' },
      { code: 'role-type:create', name: 'Create Role Type', description: 'Create Role Type' },
      { code: 'role-type:update', name: 'Update Role Type', description: 'Update Role Type' },
      { code: 'role-type:manage', name: 'Manage Role Type', description: 'Manage Role Type' },
    ],
  },
  {
    resource: 'role',
    label: 'Role',
    permissions: [
      { code: 'role:get', name: 'Get Role', description: 'Get Role' },
      { code: 'role:search', name: 'Search Role', description: 'Search Role' },
      { code: 'role:create', name: 'Create Role', description: 'Create Role' },
      { code: 'role:update', name: 'Update Role', description: 'Update Role' },
      { code: 'role:manage', name: 'Manage Role', description: 'Manage Role' },
    ],
  },
]

/** Flat list of every catalog permission, in the same order as the groups above. */
export const PERMISSION_CATALOG_FLAT: IPermission[] = PERMISSION_CATALOG.flatMap((group) => group.permissions)
