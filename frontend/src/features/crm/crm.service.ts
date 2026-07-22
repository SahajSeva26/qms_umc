import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateDivisionPayload,
  CreateLeadPayload,
  DivisionEntity,
  LeadEntity,
  MoveLeadStagePayload,
  SearchDivisionQuery,
  SearchLeadQuery,
  UpdateDivisionPayload,
  UpdateLeadPayload,
} from '@/types/crm.types'

// Real backend-integrated CRM/Lead service, replacing the old in-memory mock
// store. Follows the exact pattern of
// `@/features/access-management/accessManagement.service.ts`: same shared
// `api` axios instance, same ApiResponse/PaginatedResponse envelope typing,
// a plain object export, no class/default export.

// ---------------------------------------------------------------------------
// Divisions
// ---------------------------------------------------------------------------

const searchDivisions = async (query: SearchDivisionQuery) => {
  const res = await api.get<PaginatedResponse<DivisionEntity>>('/divisions', { params: query })
  return res.data
}

const getDivision = async (id: string) => {
  const res = await api.get<ApiResponse<DivisionEntity>>(`/divisions/${id}`)
  return res.data
}

const createDivision = async (payload: CreateDivisionPayload) => {
  const res = await api.post<ApiResponse<DivisionEntity>>('/divisions', payload)
  return res.data
}

const updateDivision = async (id: string, payload: UpdateDivisionPayload) => {
  const res = await api.put<ApiResponse<DivisionEntity>>(`/divisions/${id}`, payload)
  return res.data
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const searchLeads = async (query: SearchLeadQuery) => {
  const res = await api.get<PaginatedResponse<LeadEntity>>('/leads', { params: query })
  return res.data
}

const getLead = async (id: string) => {
  const res = await api.get<ApiResponse<LeadEntity>>(`/leads/${id}`)
  return res.data
}

const createLead = async (payload: CreateLeadPayload) => {
  const res = await api.post<ApiResponse<LeadEntity>>('/leads', payload)
  return res.data
}

const updateLead = async (id: string, payload: UpdateLeadPayload) => {
  const res = await api.put<ApiResponse<LeadEntity>>(`/leads/${id}`, payload)
  return res.data
}

// PATCH /leads/:id/stage — the ONLY path that changes a lead's status;
// UpdateLeadPayload deliberately has no status field (matches the backend's
// own UpdateLeadPayloadSchema doc comment).
const moveLeadStage = async (id: string, payload: MoveLeadStagePayload) => {
  const res = await api.patch<ApiResponse<LeadEntity>>(`/leads/${id}/stage`, payload)
  return res.data
}

export const crmService = {
  searchDivisions,
  getDivision,
  createDivision,
  updateDivision,
  searchLeads,
  getLead,
  createLead,
  updateLead,
  moveLeadStage,
}
