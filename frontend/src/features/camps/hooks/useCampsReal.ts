import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { SearchCampQuery } from '@/types/campReal.types'

// Thin useQuery wrapper keyed on the raw search query, mirroring useDoctors.ts/
// useGeoProfiles.ts exactly. Deliberately separate from `useCamps.ts` (the old
// mock-store hook ~100 files still depend on).
export const useCampsReal = (query: SearchCampQuery) => {
  return useQuery({
    queryKey: ['campsReal', query],
    queryFn: () => campsRealService.searchCamps(query),
  })
}
