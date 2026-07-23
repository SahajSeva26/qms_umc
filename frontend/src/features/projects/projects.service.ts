import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { LeadEntity, SearchLeadQuery } from '@/types/crm.types'
import type {
  CreateProjectPayload,
  MoveProjectStagePayload,
  ProjectEntity,
  SearchProjectQuery,
  UpdateProjectPayload,
} from '@/types/project.types'

// Follows the exact pattern of accessManagementService: same shared `api`
// axios instance, same ApiResponse/PaginatedResponse envelope typing, a plain
// object export, no class/default export.
//
// Default limit: 100 — GET /projects silently defaults to limit=10 server-side
// (RequestHandler.getPagination) when the caller omits it, same quirk already
// found and fixed for Lead's own search call.
const DEFAULT_LIMIT = '100'

const searchProjects = async (query: SearchProjectQuery) => {
  const res = await api.get<PaginatedResponse<ProjectEntity>>('/projects', {
    params: { limit: DEFAULT_LIMIT, ...query },
  })
  return res.data
}

const getProject = async (id: string) => {
  const res = await api.get<ApiResponse<ProjectEntity>>(`/projects/${id}`)
  return res.data
}

const createProject = async (payload: CreateProjectPayload) => {
  // NOTE: response is NOT populated — project.service.ts's create() never
  // re-fetches with {populate:true} before returning. Callers needing
  // populated relations should invalidate + refetch via useProject(id).
  const res = await api.post<ApiResponse<ProjectEntity>>('/projects', payload)
  return res.data
}

const updateProject = async (id: string, payload: UpdateProjectPayload) => {
  // Same caveat as createProject — response echo is unpopulated.
  const res = await api.put<ApiResponse<ProjectEntity>>(`/projects/${id}`, payload)
  return res.data
}

const moveProjectStage = async (id: string, payload: MoveProjectStagePayload) => {
  const res = await api.patch<ApiResponse<ProjectEntity>>(`/projects/${id}/stage`, payload)
  return res.data
}

// Scoped, self-contained call for the New Project wizard's Step 0 (pick a
// lead) — deliberately NOT routed through crmService, which is still the
// stale pre-migration mock file on this branch (crm.service.ts has no real
// searchLeads export yet). Calling GET /leads directly here keeps this
// feature's blast radius limited to Project; fixing crm.service.ts is a
// separate, pre-existing task.
const searchWonLeads = async (query: SearchLeadQuery = {}) => {
  const res = await api.get<PaginatedResponse<LeadEntity>>('/leads', {
    params: { limit: DEFAULT_LIMIT, ...query, status: 'won' },
  })
  return res.data
}

export const projectsService = {
  searchProjects,
  getProject,
  createProject,
  updateProject,
  moveProjectStage,
  searchWonLeads,
}
