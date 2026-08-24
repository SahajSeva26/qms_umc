import api from '@/lib/api/api'
import type { PaginatedResponse } from '@/types/common.types'
import type { CampEntity, SearchCampQuery } from '@/types/campReal.types'

// Deliberately NOT importing campsReal.service.ts from features/camps/ —
// cross-feature import, same isolation reasoning as billingCamps.service.ts.
// Pharma owns its own thin read-only call over GET /camps for the
// project-scoped camp list — the backend scopes results by role type
// server-side (applyOwnScope in camp.service.ts: division-head sees the
// whole division, RSM/ASM/MR see only camps they occupy an assignment slot
// on), so this call passes `project` only — no client-side role branching.
const searchScopedCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

export const pharmaCampsService = {
  searchScopedCamps,
}
