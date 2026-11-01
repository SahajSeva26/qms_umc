import { useGetEntity } from '@/hooks/useGetEntity'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import { geoProfileKeys } from '@/features/geo-profile/hooks/useGeoProfiles'

export const useGeoProfile = (id: string | undefined) => useGetEntity(geoProfileKeys.detail, geoProfileService.getGeoProfile, id)
