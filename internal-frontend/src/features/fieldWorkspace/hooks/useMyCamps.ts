import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const myCampsKeys = {
  list: (query: SearchCampQuery) => ['field-workspace-my-camps', query] as const,
}

// GET /camps/my — the logged-in FO's own camps, with a top-level status/type summary.
export const useMyCamps = (query: SearchCampQuery, enabled = true) =>
  useQuery({
    queryKey: myCampsKeys.list(query),
    queryFn: () => campsRealService.myCamps(query),
    enabled,
  })
