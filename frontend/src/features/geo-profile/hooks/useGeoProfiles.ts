import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { SearchGeoProfileQuery } from '@/features/geo-profile/geoProfile.types'

export const geoProfileKeys = createEntityKeys<SearchGeoProfileQuery>('geoProfiles', 'geoProfile')

export const useGeoProfiles = (query: SearchGeoProfileQuery) =>
  useEntityQuery(geoProfileKeys, (q) => geoProfileService.searchGeoProfiles(q), query)
