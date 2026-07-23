import { useQuery } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { SearchGeoProfileQuery } from '@/types/geoProfile.types'

// Mirrors `@/features/access-management/role/hooks/useRoles.ts` exactly: a thin
// useQuery wrapper keyed on the raw search query so callers get free
// refetch-on-change.
export const useGeoProfiles = (query: SearchGeoProfileQuery) => {
  return useQuery({
    queryKey: ['geoProfiles', query],
    queryFn: () => geoProfileService.searchGeoProfiles(query),
  })
}
