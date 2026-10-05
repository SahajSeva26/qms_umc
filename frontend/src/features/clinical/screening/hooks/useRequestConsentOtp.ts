import { useMutation } from '@tanstack/react-query'
import { screeningService } from '@/features/clinical/screening/screening.service'

// No cache invalidation — issuing/reissuing an OTP doesn't change the screening record itself
// (consent.verified only flips via verifyConsent), so there's nothing to invalidate here.
export const useRequestConsentOtp = (id: string) =>
  useMutation({
    mutationFn: () => screeningService.requestConsentOtp(id),
  })
