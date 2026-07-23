import { useMutation, useQueryClient } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { CreateGeoProfilePayload } from '@/types/geoProfile.types'

// Mirrors `@/features/access-management/role/hooks/useCreateRole.ts` exactly.
export const useCreateGeoProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGeoProfilePayload) => geoProfileService.createGeoProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geoProfiles'] })
    },
  })
}
