import type { IPermission } from '@/types/accessManagement.types'

// Hardcoded mirror of the REAL backend permission catalog
// (`backend/src/shared/env/permissions.ts` -> PERMISSIONS / PERMISSIONS_ARRAY).
// There is no dedicated "list all permissions" endpoint on the backend, so
// this catalog is hardcoded here to power the permission-group "shopping
// cart" UI: every known permission code is always rendered, grouped by
// resource, with the ones already on the group checked.
//
// This has drifted out of sync with the backend 5 times already (new backend
// modules adding a `*_PERMISSIONS` constant without a matching update here),
// each time silently breaking the permission-picker UI for whichever
// RoleType/PermissionGroup used the missing codes. Any change to a module's
// `*_PERMISSIONS` constant on the backend MUST be mirrored here in the same
// commit/PR. If a `GET /permissions` endpoint is ever added, prefer fetching
// this list live instead of hand-maintaining it.
//
// Shape mirrors the backend's own PERMISSIONS object exactly — keyed by
// resource, each resource keyed by action name (e.g. PERMISSIONS.TENANT.CREATE).

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
    // Display-only rename (Tenant -> Company) for user-facing labels, per
    // explicit user instruction — the `code` values below (`tenant:*`) are
    // real backend permission codes and MUST NOT change.
    CREATE: { code: 'tenant:create', name: 'Create Company', description: 'Create a new company' },
    GET: { code: 'tenant:get', name: 'Get Company', description: 'Get a company' },
    SEARCH: { code: 'tenant:search', name: 'Search Company', description: 'Search companies' },
    UPDATE: { code: 'tenant:update', name: 'Update Company', description: 'Update a company' },
    ADMIN: { code: 'tenant:admin', name: 'Admin Company', description: 'Admin company' },
    MANAGE: { code: 'tenant:manage', name: 'Manage Company', description: 'Manage companies' },
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
  DIVISION: {
    MANAGE: { code: 'division:manage', name: 'Manage Division', description: 'Manage divisions' },
  },
  LEAD: {
    CREATE: { code: 'lead:create', name: 'Create Lead', description: 'Create leads' },
    GET: { code: 'lead:get', name: 'Get Lead', description: 'Get leads' },
    SEARCH: { code: 'lead:search', name: 'Search Lead', description: 'View/search own leads only' },
    UPDATE: { code: 'lead:update', name: 'Update Lead', description: 'Update leads' },
    MANAGE: { code: 'lead:manage', name: 'Manage Lead', description: 'Manage leads (full visibility)' },
  },
  CONTACT: {
    CREATE: { code: 'contact:create', name: 'Create Contact', description: 'Create contacts' },
    GET: { code: 'contact:get', name: 'Get Contact', description: 'Get a contact' },
    SEARCH: { code: 'contact:search', name: 'Search Contact', description: 'View/search contacts' },
    UPDATE: { code: 'contact:update', name: 'Update Contact', description: 'Update contacts' },
    MANAGE: { code: 'contact:manage', name: 'Manage Contact', description: 'Manage contacts (full visibility across tenants)' },
  },
  APPOINTMENT: {
    CREATE: { code: 'appointment:create', name: 'Create Appointment', description: 'Create appointments' },
    GET: { code: 'appointment:get', name: 'Get Appointment', description: 'Get appointments' },
    SEARCH: { code: 'appointment:search', name: 'Search Appointment', description: 'View/search own appointments only' },
    UPDATE: { code: 'appointment:update', name: 'Update Appointment', description: 'Update appointments' },
    RSVP: { code: 'appointment:rsvp', name: 'RSVP Appointment', description: 'Respond (accept/decline) to appointment invites you are a member of' },
    MANAGE: { code: 'appointment:manage', name: 'Manage Appointment', description: 'Manage appointments (full visibility)' },
  },
  PROJECT: {
    CREATE: { code: 'project:create', name: 'Create Project', description: 'Create projects' },
    GET: { code: 'project:get', name: 'Get Project', description: 'Get projects' },
    SEARCH: { code: 'project:search', name: 'Search Project', description: 'View/search own projects only' },
    UPDATE: { code: 'project:update', name: 'Update Project', description: 'Update projects' },
    MANAGE: { code: 'project:manage', name: 'Manage Project', description: 'Manage projects (full visibility)' },
  },
  QA_FEEDBACK: {
    CREATE: { code: 'qa-feedback:create', name: 'Create QA Feedback', description: 'Report a QA feedback comment' },
    MANAGE: { code: 'qa-feedback:manage', name: 'Manage QA Feedback', description: 'Review and resolve QA feedback' },
  },
  CAMP: {
    GET: { code: 'camp:get', name: 'Get Camp', description: 'Get camps' },
    SEARCH: { code: 'camp:search', name: 'Search Camp', description: 'View/search only camps the actor is assigned to (fo/mr/asm/rsm)' },
    CREATE: { code: 'camp:create', name: 'Create Camp', description: 'Create camps' },
    UPDATE: { code: 'camp:update', name: 'Update Camp', description: 'Update camps' },
    MANAGE: { code: 'camp:manage', name: 'Manage Camp', description: 'Manage camps (full visibility across the tenant)' },
  },
  DOCTOR: {
    MANAGE: { code: 'doctor:manage', name: 'Manage Doctor', description: 'Manage doctors (full visibility, incl. inactive)' },
  },
  GEO_PROFILE: {
    MANAGE: { code: 'geo-profile:manage', name: 'Manage Geo Profile', description: 'Manage geo profiles (field-staff location + coverage used for camp allocation)' },
  },
  COUNTER: {
    MANAGE: { code: 'counter:manage', name: 'Manage Counter', description: 'Manage counters (full visibility, incl. inactive)' },
  },
  INVENTORY_MASTER: {
    MANAGE: { code: 'inventory-master:manage', name: 'Manage Inventory Master', description: 'Manage inventory master items (full visibility, incl. inactive)' },
  },
} as const

/** Display labels for each resource group header — keys must match PERMISSION_CATALOG exactly. */
export const PERMISSION_RESOURCE_LABELS: Record<keyof typeof PERMISSION_CATALOG, string> = {
  SYSTEM: 'System',
  USER: 'User',
  TENANT: 'Company',
  PERMISSION_GROUP: 'Permission Group',
  ROLE_TYPE: 'Role Type',
  ROLE: 'Role',
  DIVISION: 'Division',
  LEAD: 'Lead',
  CONTACT: 'Contact',
  APPOINTMENT: 'Appointment',
  PROJECT: 'Project',
  QA_FEEDBACK: 'QA Feedback',
  CAMP: 'Camp',
  DOCTOR: 'Doctor',
  GEO_PROFILE: 'Geo Profile',
  COUNTER: 'Counter',
  INVENTORY_MASTER: 'Inventory Master',
}

/** Flat list of every catalog permission, in the same order as PERMISSION_CATALOG's keys. */
export const PERMISSION_CATALOG_FLAT: IPermission[] = Object.values(PERMISSION_CATALOG).flatMap((resource) =>
  Object.values(resource),
)
