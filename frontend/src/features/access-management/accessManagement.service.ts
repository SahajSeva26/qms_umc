import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreatePermissionGroupPayload,
  CreateRolePayload,
  CreateRoleTypePayload,
  CreateTenantPayload,
  PermissionGroupEntity,
  RoleEntity,
  RoleTypeEntity,
  SearchPermissionGroupQuery,
  SearchRoleQuery,
  SearchRoleTypeQuery,
  SearchTenantQuery,
  SessionResponse,
  Tenant,
  UpdatePermissionGroupPayload,
  UpdateRolePayload,
  UpdateRoleTypePayload,
  UpdateTenantPayload,
} from '@/types/accessManagement.types'

// Follows the exact pattern of `@/features/admin/admin.service.ts`:
// - same shared `api` axios instance (withCredentials cookie auth, untouched)
// - same ApiResponse/PaginatedResponse envelope typing from '@/types/common.types'
// - a plain object export, no class/default export
// - honest '// TODO' comments wherever the backend under/over-returns vs. what's ideal
//
// This file is purely additive and does not import from or modify any of the
// existing auth/admin files.

// ---------------------------------------------------------------------------
// Session (GET /auth/me)
// ---------------------------------------------------------------------------

/**
 * Fetches the current session: user, active role, role type, tenant, and the
 * flattened permission-code list. This is a NEW, independent read — it is not
 * wired into useAuthStore/useLogin/useAuth in any way.
 */
const getMe = async () => {
  const res = await api.get<ApiResponse<SessionResponse>>('/auth/me')
  return res.data
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

const searchTenants = async (query: SearchTenantQuery) => {
  const res = await api.get<PaginatedResponse<Tenant>>('/tenants', { params: query })
  return res.data
}

const getTenant = async (id: string) => {
  const res = await api.get<ApiResponse<Tenant>>(`/tenants/${id}`)
  return res.data
}

const getMyTenant = async () => {
  const res = await api.get<ApiResponse<Tenant>>('/tenants/me')
  return res.data
}

const createTenant = async (payload: CreateTenantPayload) => {
  const res = await api.post<ApiResponse<Tenant>>('/tenants', payload)
  return res.data
}

const updateTenant = async (id: string, payload: UpdateTenantPayload) => {
  const res = await api.put<ApiResponse<Tenant>>(`/tenants/${id}`, payload)
  return res.data
}

// ---------------------------------------------------------------------------
// Permission Groups
// ---------------------------------------------------------------------------

const searchPermissionGroups = async (query: SearchPermissionGroupQuery) => {
  const res = await api.get<PaginatedResponse<PermissionGroupEntity>>('/permission-groups', {
    params: query,
  })
  return res.data
}

const getPermissionGroup = async (id: string) => {
  const res = await api.get<ApiResponse<PermissionGroupEntity>>(`/permission-groups/${id}`)
  return res.data
}

// TODO: backend POST /permission-groups route is currently commented out in
// permissionGroup.routes.ts — there is no live create endpoint. This call is
// wired per the documented CreatePermissionGroupPayloadSchema so it "just
// works" the moment the route is re-enabled, but calling it today will 404.
const createPermissionGroup = async (payload: CreatePermissionGroupPayload) => {
  const res = await api.post<ApiResponse<PermissionGroupEntity>>('/permission-groups', payload)
  return res.data
}

const updatePermissionGroup = async (id: string, payload: UpdatePermissionGroupPayload) => {
  const res = await api.put<ApiResponse<PermissionGroupEntity>>(`/permission-groups/${id}`, payload)
  return res.data
}

// ---------------------------------------------------------------------------
// Role Types
// ---------------------------------------------------------------------------

const searchRoleTypes = async (query: SearchRoleTypeQuery) => {
  const res = await api.get<PaginatedResponse<RoleTypeEntity>>('/role-types', { params: query })
  return res.data
}

const getRoleType = async (id: string) => {
  const res = await api.get<ApiResponse<RoleTypeEntity>>(`/role-types/${id}`)
  return res.data
}

const createRoleType = async (payload: CreateRoleTypePayload) => {
  const res = await api.post<ApiResponse<RoleTypeEntity>>('/role-types', payload)
  return res.data
}

const updateRoleType = async (id: string, payload: UpdateRoleTypePayload) => {
  const res = await api.put<ApiResponse<RoleTypeEntity>>(`/role-types/${id}`, payload)
  return res.data
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const searchRoles = async (query: SearchRoleQuery) => {
  const res = await api.get<PaginatedResponse<RoleEntity>>('/roles', { params: query })
  return res.data
}

const getRole = async (id: string) => {
  const res = await api.get<ApiResponse<RoleEntity>>(`/roles/${id}`)
  return res.data
}

const createRole = async (payload: CreateRolePayload) => {
  const res = await api.post<ApiResponse<RoleEntity>>('/roles', payload)
  return res.data
}

const updateRole = async (id: string, payload: UpdateRolePayload) => {
  const res = await api.put<ApiResponse<RoleEntity>>(`/roles/${id}`, payload)
  return res.data
}

export const accessManagementService = {
  getMe,
  searchTenants,
  getTenant,
  getMyTenant,
  createTenant,
  updateTenant,
  searchPermissionGroups,
  getPermissionGroup,
  createPermissionGroup,
  updatePermissionGroup,
  searchRoleTypes,
  getRoleType,
  createRoleType,
  updateRoleType,
  searchRoles,
  getRole,
  createRole,
  updateRole,
}
