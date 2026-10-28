import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { ProjectEntity, SearchProjectQuery } from '@/types/project.types'

// Deliberately not importing projects.service.ts — cross-feature import,
// same isolation reasoning as billingProjects.service.ts.
// No division param — for a customer/pharma caller the backend derives it
// from ctx.role.division regardless of what's sent.
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
