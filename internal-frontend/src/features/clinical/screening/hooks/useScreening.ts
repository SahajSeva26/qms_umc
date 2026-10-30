import { useGetEntity } from '@/hooks/useGetEntity'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { screeningKeys } from '@/features/clinical/screening/hooks/useScreenings'

export const useScreening = (id: string | undefined) => useGetEntity(screeningKeys.detail, screeningService.getScreening, id)
