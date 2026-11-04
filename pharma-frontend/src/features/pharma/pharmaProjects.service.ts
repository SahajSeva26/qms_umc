import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@qms/core'
import type { ProjectEntity, SearchProjectQuery } from '@/types/project.types'
import type { ProjectRequirementsResponse } from '@/features/pharma/projectRequirements.types'

// No division param — for a customer/pharma caller the backend derives it from
// ctx.role.division regardless of what's sent.
const searchScopedProjects = async (query: SearchProjectQuery) => {
  const res = await api.get<PaginatedResponse<ProjectEntity>>('/projects', { params: query })
  return res.data
}

const getProject = async (id: string) => {
  const res = await api.get<ApiResponse<ProjectEntity>>(`/projects/${id}`)
  return res.data
}

// Requested, not yet built — see md-files/BACKEND_REQUEST_book-camp-requirements.md. Will 404
// until the backend ships it; useProjectRequirements handles that as an ordinary error state.
const getProjectRequirements = async (id: string) => {
  const res = await api.get<ApiResponse<ProjectRequirementsResponse>>(`/projects/${id}/requirements`)
  return res.data
}

export const pharmaProjectsService = {
  searchScopedProjects,
  getProject,
  getProjectRequirements,
}
