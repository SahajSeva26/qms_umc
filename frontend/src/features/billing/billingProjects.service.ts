import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { ProjectEntity, SearchProjectQuery } from '@/features/projects/project.types'

// Deliberately NOT importing projects.service.ts from features/projects/ —
// cross-feature import, same isolation reasoning as billingCamps.service.ts.
// Billing owns its own thin read-only call over GET /projects for the
// project picker (name search only — the backend has no code/ID typeahead).
const searchProjects = async (query: SearchProjectQuery) => {
  const res = await api.get<PaginatedResponse<ProjectEntity>>('/projects', { params: query })
  return res.data
}

// Single-project fetch — used once the picker resolves an id, so
// GenerateInvoiceDialog/InvoiceDetailDrawer have the full ProjectEntity
// (campCost) to work with, not just id+label.
const getProject = async (id: string) => {
  const res = await api.get<ApiResponse<ProjectEntity>>(`/projects/${id}`)
  return res.data
}

export const billingProjectsService = {
  searchProjects,
  getProject,
}
