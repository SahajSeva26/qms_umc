import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { ProjectEntity, SearchProjectQuery } from '@/types/project.types'

// Deliberately NOT importing projects.service.ts from features/projects/ —
// cross-feature import, same isolation reasoning as billingProjects.service.ts.
// Pharma owns its own thin read-only call over GET /projects — the backend
// scopes results to the caller's own division server-side (applyOwnScope in
// project.service.ts) for any customer-tenant actor, so no division param is
// passed here; it would be redundant at best (the backend derives it from
// ctx.role.division unconditionally, ignoring anything a client sends).
const searchScopedProjects = async (query: SearchProjectQuery) => {
  const res = await api.get<PaginatedResponse<ProjectEntity>>('/projects', { params: query })
  return res.data
}

const getProject = async (id: string) => {
  const res = await api.get<ApiResponse<ProjectEntity>>(`/projects/${id}`)
  return res.data
}

export const pharmaProjectsService = {
  searchScopedProjects,
  getProject,
}
