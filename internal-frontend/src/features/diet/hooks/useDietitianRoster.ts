import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDietitianRoster, addDietitianEnrollment, updateDietitianDetails, addDietitianBank,
  setDietitianResume, setDietitianDeviceAlignment, submitDietitianForInterview,
} from '@/features/diet/services/dietitianRoster.service'
import type { DietitianBankAccount, DietitianDetails } from '@/features/diet/dietitians.types'
import { dietKeys } from './dietQueryKeys'

// Canonical dietitian roster — identity + the onboarding pipeline.
//
// This module is the AUTHORIZATION BOUNDARY for roster writes. Every mutation
// below is a single user-triggered action, so when RBAC lands each `mutationFn`
// is the one place a `hasPermission('dietitian.create' | 'dietitian.edit' |
// 'bank.edit' | 'dietitian.approve')` check goes — not the ~8 components that
// call them. Frontend checks are UX only; the backend must enforce the same
// rules independently.
//
// Writes invalidate the whole `['diet']` subtree rather than just the roster
// key: the enrolment and bank stores also feed the profile bundle, the joined
// directory and the payment rollup's bankComplete flag, so a narrower
// invalidation would leave those stale. Cheap today (localStorage); when the
// real API lands these can be narrowed per-endpoint.

export const useDietitianRoster = () => {
  return useQuery({
    queryKey: dietKeys.roster(),
    queryFn: getDietitianRoster,
  })
}

/** Shared invalidation for every roster-family write. */
function useInvalidateDiet() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: dietKeys.all })
}

/** dietitian.create */
export const useEnrollDietitian = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: (payload: Parameters<typeof addDietitianEnrollment>[0]) => addDietitianEnrollment(payload),
    onSuccess: invalidate,
  })
}

/** bank.edit / dietitian.edit — the details overlay (bank, printing, target cost). */
export const useUpdateDietitianDetails = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DietitianDetails> }) => updateDietitianDetails(id, patch),
    onSuccess: invalidate,
  })
}

/** bank.edit — append a single account. */
export const useAddDietitianBank = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: ({ id, account }: { id: string; account: Omit<DietitianBankAccount, 'capturedAt'> }) => addDietitianBank(id, account),
    onSuccess: invalidate,
  })
}

/** dietitian.edit — onboarding artefacts. */
export const useSetDietitianResume = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: ({ id, resumeUrl }: { id: string; resumeUrl: string }) => setDietitianResume(id, resumeUrl),
    onSuccess: invalidate,
  })
}

export const useSetDietitianDeviceAlignment = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: ({ id, deviceAlignment }: { id: string; deviceAlignment: string[] }) => setDietitianDeviceAlignment(id, deviceAlignment),
    onSuccess: invalidate,
  })
}

/** dietitian.approve — moves the enrolment into the OM·Diet interview queue. */
export const useSubmitDietitianForInterview = () => {
  const invalidate = useInvalidateDiet()
  return useMutation({
    mutationFn: (id: string) => submitDietitianForInterview(id),
    onSuccess: invalidate,
  })
}
