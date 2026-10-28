import { useQuery } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { NearestGeoProfileQuery } from '@/types/geoProfile.types'

// Wraps GET /geo-profiles/nearest — the allocation lookup (nearest active
// field staff of a type whose own coverage radius reaches the query point).
// `enabled` guards on lng/lat both being finite numbers so this never fires
// with NaN query params while the lookup form is still being filled in.
export const useNearestGeoProfiles = (query: NearestGeoProfileQuery | null) => {
  return useQuery({
    queryKey: ['geoProfiles', 'nearest', query],
    queryFn: () => geoProfileService.nearestGeoProfiles(query as NearestGeoProfileQuery),
    enabled: !!query && Number.isFinite(query.lng) && Number.isFinite(query.lat),
  })
}
