import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import { geoProfileKeys } from '@/features/geo-profile/hooks/useGeoProfiles'
import type { UpdateGeoProfilePayload } from '@/types/geoProfile.types'

export const useUpdateGeoProfile = (id: string) =>
  useUpdateEntity((payload: UpdateGeoProfilePayload) => geoProfileService.updateGeoProfile(id, payload), [geoProfileKeys.detail(id), geoProfileKeys.all])
