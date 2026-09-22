import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { campsRealService } from '@/features/camps/campsReal.service'
import { CAMP_QUERY_NAMESPACES } from '@/types/campQueryKeys'
import type { SearchCampQuery } from '@/types/campReal.types'

export const campRealKeys = createEntityKeys<SearchCampQuery>(CAMP_QUERY_NAMESPACES.internal, 'campReal')

// Deliberately separate from `useCamps.ts` (the old mock-store hook ~100
// files still depend on).
export const useCampsReal = (query: SearchCampQuery) => useEntityQuery(campRealKeys, (q) => campsRealService.searchCamps(q), query)
