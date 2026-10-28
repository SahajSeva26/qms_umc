import api from '@/lib/api/api'
import type { PaginatedResponse } from '@/types/common.types'
import type { CampEntity, SearchCampQuery } from '@/types/campReal.types'

// Deliberately NOT importing campsReal.service.ts from features/camps/ —
// that would be a cross-feature import (CLAUDE.md §3 isolation rule).
// Billing owns its own thin read-only call over GET /camps for the
// eligible-camps picker.
const searchCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

export const billingCampsService = {
  searchCamps,
}
