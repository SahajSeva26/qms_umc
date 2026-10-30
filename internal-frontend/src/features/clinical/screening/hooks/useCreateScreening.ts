import { useCreateEntity } from '@/hooks/useCreateEntity'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { screeningKeys } from '@/features/clinical/screening/hooks/useScreenings'
import type { CreateScreeningPayload } from '@/features/clinical/screening/screening.types'

export const useCreateScreening = () =>
  useCreateEntity((payload: CreateScreeningPayload) => screeningService.createScreening(payload), screeningKeys.all)
