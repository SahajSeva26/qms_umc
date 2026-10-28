import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { CampEntity, CampSummary, SearchCampQuery } from '@/types/campReal.types'

// Deliberately not importing campsReal.service.ts — cross-feature import,
// same isolation reasoning as billingCamps.service.ts. Backend scopes results by role server-side.
const searchScopedCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

// GET /camps/:id — reads are tenant-scoped but open to any authenticated user server-side; the
// Camp Dossier uses this for a single camp regardless of how the caller reached it (drawer or
// a direct standalone-page link).
const getCamp = async (id: string) => {
  const res = await api.get<ApiResponse<CampEntity>>(`/camps/${id}`)
  return res.data
}

export interface MyCampsResponse {
  success: boolean
  message: string
  data: { count: number; items: CampEntity[]; summary: CampSummary }
}

// GET /camps/my — field-force's own camps (FO/dietitian/MR), scoped server-side to the
// caller's own slot. Carries a top-level `summary` (status/type counts) beyond the page itself.
const myCamps = async (query: SearchCampQuery) => {
  const res = await api.get<MyCampsResponse>('/camps/my', { params: query })
  return res.data
}

export const pharmaCampsService = {
  searchScopedCamps,
  myCamps,
  getCamp,
}
