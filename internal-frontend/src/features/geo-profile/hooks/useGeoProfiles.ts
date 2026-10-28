import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { SearchGeoProfileQuery } from '@/types/geoProfile.types'

export const geoProfileKeys = createEntityKeys<SearchGeoProfileQuery>('geoProfiles', 'geoProfile')

// `enabled` lets callers (e.g. FieldOfficerDetailPage's role-id-scoped lookup)
// defer the query until the id it's keyed on is actually known.
export const useGeoProfiles = (query: SearchGeoProfileQuery, enabled = true) =>
  useEntityQuery(geoProfileKeys, (q) => geoProfileService.searchGeoProfiles(q), query, { enabled })
