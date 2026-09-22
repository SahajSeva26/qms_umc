import api from '@/lib/api/api'
import { validateApiResponse } from '@/lib/api/validateApiResponse'
import { AuthMeResponseSchema } from '@/features/access-management/accessManagement.response-schemas'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateEmployeePayload,
  CreateRolePayload,
  CreateRoleTypePayload,
  CreateTenantPayload,
  EmployeeEntity,
  PermissionGroupEntity,
  RoleEntity,
  RoleTypeEntity,
  SearchDownlineMrQuery,
  SearchEmployeeQuery,
  SearchPermissionGroupQuery,
  SearchRoleQuery,
  SearchRoleTypeQuery,
  SearchTenantQuery,
  SessionResponse,
  Tenant,
  UpdateEmployeePayload,
  UpdatePermissionGroupPayload,
  UpdateRolePayload,
  UpdateRoleTypePayload,
  UpdateTenantPayload,
} from '@/types/accessManagement.types'

// ---------------------------------------------------------------------------
// Session (GET /auth/me)
// ---------------------------------------------------------------------------

const getMe = async () => {
  const res = await api.get<ApiResponse<SessionResponse>>('/auth/me')
  validateApiResponse(AuthMeResponseSchema, res.data, '/auth/me')
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

// Purpose-built for pharma HO/RSM/ASM booking-on-behalf pickers. Route MUST
// be '/roles/mrs', not '/roles/{id}' with id='mrs' — see role.routes.ts.
const searchDownlineMrs = async (query: SearchDownlineMrQuery) => {
  const res = await api.get<PaginatedResponse<RoleEntity>>('/roles/mrs', { params: query })
  return res.data
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

const searchEmployees = async (query: SearchEmployeeQuery) => {
  const res = await api.get<PaginatedResponse<EmployeeEntity>>('/employees', { params: query })
  return res.data
}

const getEmployee = async (id: string) => {
  const res = await api.get<ApiResponse<EmployeeEntity>>(`/employees/${id}`)
  return res.data
}

const createEmployee = async (payload: CreateEmployeePayload) => {
  const res = await api.post<ApiResponse<EmployeeEntity>>('/employees', payload)
  return res.data
}

const updateEmployee = async (id: string, payload: UpdateEmployeePayload) => {
  const res = await api.put<ApiResponse<EmployeeEntity>>(`/employees/${id}`, payload)
  return res.data
}

export const accessManagementService = {
  getMe,
  searchTenants,
  getTenant,
  createTenant,
  updateTenant,
  searchPermissionGroups,
  getPermissionGroup,
  updatePermissionGroup,
  searchRoleTypes,
  getRoleType,
  createRoleType,
  updateRoleType,
  searchRoles,
  getRole,
  createRole,
  updateRole,
  searchDownlineMrs,
  searchEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
}
