import { useMutation, useQueryClient } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { UpdateGeoProfilePayload } from '@/types/geoProfile.types'

// Mirrors `@/features/access-management/role/hooks/useUpdateRole.ts` exactly.
export const useUpdateGeoProfile = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateGeoProfilePayload) => geoProfileService.updateGeoProfile(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geoProfile', id] })
      queryClient.invalidateQueries({ queryKey: ['geoProfiles'] })
    },
  })
}
