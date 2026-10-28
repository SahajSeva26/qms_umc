import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import { CAMP_QUERY_NAMESPACES } from '@/types/campQueryKeys'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaCampKeys = createEntityKeys<SearchCampQuery>(CAMP_QUERY_NAMESPACES.pharma, 'pharma-camp')

// `enabled` MUST be driven by the resolved project object, never just a
// truthy id param — an inaccessible project must never let this query fire.
export const usePharmaCamps = (query: SearchCampQuery, options?: { enabled?: boolean }) =>
  useEntityQuery(pharmaCampKeys, (q) => pharmaCampsService.searchScopedCamps(q), query, options)
