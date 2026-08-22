import { useCreateEntity } from '@/hooks/useCreateEntity'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import { geoProfileKeys } from '@/features/geo-profile/hooks/useGeoProfiles'
import type { CreateGeoProfilePayload } from '@/features/geo-profile/geoProfile.types'

export const useCreateGeoProfile = () =>
  useCreateEntity((payload: CreateGeoProfilePayload) => geoProfileService.createGeoProfile(payload), geoProfileKeys.all)
