import api from '@/lib/api/api'
import type { PaginatedResponse } from '@/types/common.types'
import type { CampEntity, SearchCampQuery } from '@/types/campReal.types'

// Deliberately not importing campsReal.service.ts — cross-feature import,
// same isolation reasoning as billingCamps.service.ts. Backend scopes results by role server-side.
const searchScopedCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

export const pharmaCampsService = {
  searchScopedCamps,
}
