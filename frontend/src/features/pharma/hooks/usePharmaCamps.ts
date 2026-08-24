import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaCampKeys = createEntityKeys<SearchCampQuery>('pharma-camps', 'pharma-camp')

// `enabled` MUST be driven by the resolved project object (usePharmaProject's
// data), never just a truthy id param — see PharmaProjectCampsPage.tsx /
// Decision 6. An inaccessible project must never let this query fire at all.
export const usePharmaCamps = (query: SearchCampQuery, options?: { enabled?: boolean }) =>
  useEntityQuery(pharmaCampKeys, (q) => pharmaCampsService.searchScopedCamps(q), query, options)
