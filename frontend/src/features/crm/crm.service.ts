import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateLeadPayload,
  LeadEntity,
  MoveLeadStagePayload,
  SearchLeadQuery,
  UpdateLeadPayload,
} from '@/features/crm/crm.types'

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

// The only path that changes a lead's status; UpdateLeadPayload has no status field.
const moveLeadStage = async (id: string, payload: MoveLeadStagePayload) => {
  const res = await api.patch<ApiResponse<LeadEntity>>(`/leads/${id}/stage`, payload)
  return res.data
}

export const crmService = {
  searchLeads,
  getLead,
  createLead,
  updateLead,
  moveLeadStage,
}
