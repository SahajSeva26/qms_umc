import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { screeningKeys } from '@/features/clinical/screening/hooks/useScreenings'
import type { UpdateScreeningPayload } from '@/features/clinical/screening/screening.types'

export const useUpdateScreening = (id: string) =>
  useUpdateEntity(
    (payload: UpdateScreeningPayload) => screeningService.updateScreening(id, payload),
    [screeningKeys.all, screeningKeys.detail(id)],
  )
