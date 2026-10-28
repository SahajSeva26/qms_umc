import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { screeningService } from '@/features/clinical/screening/screening.service'
import type { SearchScreeningQuery } from '@/features/clinical/screening/screening.types'

export const screeningKeys = createEntityKeys<SearchScreeningQuery>('screenings', 'screening')

export const useScreenings = (query: SearchScreeningQuery, enabled = true) =>
  useEntityQuery(screeningKeys, (q) => screeningService.searchScreenings(q), query, { enabled })
