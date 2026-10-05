import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { screeningKeys } from '@/features/clinical/screening/hooks/useScreenings'
import type { VerifyConsentPayload } from '@/features/clinical/screening/screening.types'

export const useVerifyConsent = (id: string) =>
  useUpdateEntity(
    (payload: VerifyConsentPayload) => screeningService.verifyConsent(id, payload),
    [screeningKeys.all, screeningKeys.detail(id)],
  )
