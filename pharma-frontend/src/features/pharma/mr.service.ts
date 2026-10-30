import api from '@/lib/api/api'
import type { PaginatedResponse } from '@qms/core'
import type { EligibleMr, SearchDownlineMrQuery } from '@/features/pharma/mr.types'

// Purpose-built for pharma HO/RSM/ASM booking-on-behalf pickers. Route MUST be '/roles/mrs', not
// '/roles/{id}' with id='mrs' — mirrors internal-frontend's searchDownlineMrs. Server-scopes
// results to the caller's own downline (ASM: direct reports; RSM: 2-level downline; division-head:
// division) — never returns more than the caller is actually allowed to book for.
export const searchDownlineMrs = async (query: SearchDownlineMrQuery) => {
  const res = await api.get<PaginatedResponse<EligibleMr>>('/roles/mrs', { params: query })
  return res.data
}
