import { useQuery } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'

// Mirrors `@/features/access-management/role/hooks/useRole.ts` exactly.
export const useGeoProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ['geoProfile', id],
    queryFn: () => geoProfileService.getGeoProfile(id as string),
    enabled: !!id,
  })
}
