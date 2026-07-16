import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as omService from '@/features/om/om.service'
import type { FoEnrollment, DietitianEnrollment, ExpenseStatus, PaymentMode, DietitianPaymentDetails } from '@/features/om/om.types'
import { useCampsData } from '@/hooks/useCampsData'

// Camp reads/writes go through the shared useCampsData hook — om.service.ts
// itself never imports features/camps/ or touches qms.master.camps directly
// (features/camps/ is the sole owner of that store, per CLAUDE.md §3).
export const useOm = () => {
  const queryClient = useQueryClient()
  const { camps, patchCamp } = useCampsData()

  const foEnrollQuery = useQuery({ queryKey: ['om-fo-enroll'], queryFn: omService.getFoEnrollments })
  const dietEnrollQuery = useQuery({ queryKey: ['om-diet-enroll'], queryFn: omService.getDietEnrollments })
  const expenseOverlayQuery = useQuery({ queryKey: ['om-expense-overlay'], queryFn: omService.getExpenseOverlay })
  const dietPaymentsQuery = useQuery({ queryKey: ['om-diet-payments'], queryFn: omService.getDietPayments })
  const invitesQuery = useQuery({ queryKey: ['om-invites'], queryFn: omService.getInvites })
  const equipmentQuery = useQuery({ queryKey: ['om-equipment'], queryFn: omService.getEquipment })
  const feedbackQuery = useQuery({ queryKey: ['om-feedback'], queryFn: omService.getFeedback })
  const rateHistoryQuery = useQuery({ queryKey: ['om-rate-history'], queryFn: omService.getAllRateHistory })
  const foDetailsQuery = useQuery({ queryKey: ['om-fo-details'], queryFn: omService.getFoDetailsOverlay })
  const dietPaymentDetailsQuery = useQuery({ queryKey: ['om-diet-payment-details'], queryFn: omService.getDietPaymentDetails })

  const invalidateFo = () => queryClient.invalidateQueries({ queryKey: ['om-fo-enroll'] })
  const invalidateDiet = () => queryClient.invalidateQueries({ queryKey: ['om-diet-enroll'] })
  const invalidateExpenses = () => queryClient.invalidateQueries({ queryKey: ['om-expense-overlay'] })
  const invalidatePayments = () => queryClient.invalidateQueries({ queryKey: ['om-diet-payments'] })
  const invalidateInvites = () => queryClient.invalidateQueries({ queryKey: ['om-invites'] })
  const invalidateFoDetails = () => queryClient.invalidateQueries({ queryKey: ['om-fo-details'] })
  const invalidateDietPaymentDetails = () => queryClient.invalidateQueries({ queryKey: ['om-diet-payment-details'] })

  const addFoMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; email: string; hq: string; states: string[] }) => omService.addFoEnrollment(payload),
    onSuccess: invalidateFo,
  })
  const saveFoDetailsMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FoEnrollment> }) => omService.saveFoDetails(id, patch),
    onSuccess: invalidateFo,
  })
  const approveFoMutation = useMutation({ mutationFn: (id: string) => omService.approveFoEnroll(id), onSuccess: invalidateFo })
  const rejectFoMutation = useMutation({ mutationFn: (id: string) => omService.rejectFoEnroll(id), onSuccess: invalidateFo })

  const addDietMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; email: string; hq: string; states: string[]; specialty?: string; ratePerCamp?: number }) => omService.addDietEnrollment(payload),
    onSuccess: invalidateDiet,
  })
  const saveDietDetailsMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DietitianEnrollment> }) => omService.saveDietDetails(id, patch),
    onSuccess: invalidateDiet,
  })
  const submitDietInterviewMutation = useMutation({ mutationFn: (id: string) => omService.submitDietitianForInterview(id), onSuccess: invalidateDiet })
  const dietInterviewDecisionMutation = useMutation({
    mutationFn: ({ id, outcome, notes, by }: { id: string; outcome: 'APPROVED' | 'REJECTED'; notes: string; by: string }) =>
      omService.omInterviewDecision(id, outcome, notes, by),
    onSuccess: invalidateDiet,
  })

  const setExpenseStatusMutation = useMutation({
    mutationFn: ({ expId, status }: { expId: string; status: ExpenseStatus }) => omService.setExpenseStatus(expId, status),
    onSuccess: invalidateExpenses,
  })

  const addDietPaymentMutation = useMutation({
    mutationFn: (payload: { paidBy: string; mode: PaymentMode; ref: string; campIds: string[]; notes: string; amount: number }) => omService.addDietPayment(payload),
    onSuccess: invalidatePayments,
  })

  const recordRatesMutation = useMutation({
    mutationFn: async ({ dietitianId, campId, rates, reason, by }: { dietitianId: string; campId: string; rates: { remuneration: number; ta: number; printing: number }; reason: string; by: string }) => {
      const patch = await omService.recordDietitianRates(dietitianId, campId, rates, reason, by)
      return patchCamp(campId, patch)
    },
  })

  const addInviteMutation = useMutation({
    mutationFn: ({ campId, invite }: { campId: string; invite: Parameters<typeof omService.addInvite>[1] }) => omService.addInvite(campId, invite),
    onSuccess: invalidateInvites,
  })

  const assignFoMutation = useMutation({
    mutationFn: ({ campId, foId, foName }: { campId: string; foId: string; foName: string }) => {
      const camp = camps.find((c) => c.id === campId)
      return patchCamp(campId, omService.omAssignFoPatch(camp, foId, foName))
    },
  })
  const assignDevicesMutation = useMutation({
    mutationFn: ({ campId, deviceIds }: { campId: string; deviceIds: string[] }) => patchCamp(campId, omService.omAssignDevicesPatch(deviceIds)),
  })
  const proposeDietitianMutation = useMutation({
    mutationFn: ({ campId, dietitianId, dietitianName, reasons, score, by }: { campId: string; dietitianId: string; dietitianName: string; reasons: string[]; score: number; by: string }) =>
      patchCamp(campId, omService.proposeDietitianForCampPatch(dietitianId, dietitianName, reasons, score, by)),
  })
  const decideReopenMutation = useMutation({
    mutationFn: ({ campId, requestId, decision, by, denialReason }: { campId: string; requestId: string; decision: 'APPROVED' | 'DENIED'; by: string; denialReason?: string }) => {
      const camp = camps.find((c) => c.id === campId)
      return patchCamp(campId, omService.decideTokenReopenPatch(camp, requestId, decision, by, denialReason))
    },
  })
  const saveRealPersonDetailsMutation = useMutation({
    mutationFn: ({ personId, patch }: { personId: string; patch: omService.FoDetailsOverlay }) => omService.saveRealPersonDetails(personId, patch),
    onSuccess: invalidateFoDetails,
  })
  const saveDietPaymentDetailsMutation = useMutation({
    mutationFn: ({ dietitianId, patch }: { dietitianId: string; patch: Partial<DietitianPaymentDetails> }) =>
      omService.saveDietPaymentDetails(dietitianId, patch),
    onSuccess: invalidateDietPaymentDetails,
  })

  return {
    foEnrollments: foEnrollQuery.data ?? [],
    dietEnrollments: dietEnrollQuery.data ?? [],
    expenseOverlay: expenseOverlayQuery.data ?? {},
    dietPayments: dietPaymentsQuery.data ?? [],
    invites: invitesQuery.data ?? {},
    equipment: equipmentQuery.data ?? {},
    feedback: feedbackQuery.data ?? {},
    rateHistory: rateHistoryQuery.data ?? {},
    foDetailsOverlay: foDetailsQuery.data ?? {},
    dietPaymentDetails: dietPaymentDetailsQuery.data ?? {},
    isLoading: foEnrollQuery.isLoading || dietEnrollQuery.isLoading,

    addFoEnrollment: (payload: { name: string; phone: string; email: string; hq: string; states: string[] }) => addFoMutation.mutateAsync(payload),
    saveFoDetails: (id: string, patch: Partial<FoEnrollment>) => saveFoDetailsMutation.mutateAsync({ id, patch }),
    approveFoEnroll: (id: string) => approveFoMutation.mutateAsync(id),
    rejectFoEnroll: (id: string) => rejectFoMutation.mutateAsync(id),

    addDietEnrollment: (payload: { name: string; phone: string; email: string; hq: string; states: string[]; specialty?: string; ratePerCamp?: number }) => addDietMutation.mutateAsync(payload),
    saveDietDetails: (id: string, patch: Partial<DietitianEnrollment>) => saveDietDetailsMutation.mutateAsync({ id, patch }),
    submitDietitianForInterview: (id: string) => submitDietInterviewMutation.mutateAsync(id),
    omInterviewDecision: (id: string, outcome: 'APPROVED' | 'REJECTED', notes: string, by: string) => dietInterviewDecisionMutation.mutateAsync({ id, outcome, notes, by }),

    setExpenseStatus: (expId: string, status: ExpenseStatus) => setExpenseStatusMutation.mutateAsync({ expId, status }),
    addDietPayment: (payload: { paidBy: string; mode: PaymentMode; ref: string; campIds: string[]; notes: string; amount: number }) => addDietPaymentMutation.mutateAsync(payload),
    recordDietitianRates: (dietitianId: string, campId: string, rates: { remuneration: number; ta: number; printing: number }, reason: string, by: string) =>
      recordRatesMutation.mutateAsync({ dietitianId, campId, rates, reason, by }),
    addInvite: (campId: string, invite: Parameters<typeof omService.addInvite>[1]) => addInviteMutation.mutateAsync({ campId, invite }),

    assignFo: (campId: string, foId: string, foName: string) => assignFoMutation.mutateAsync({ campId, foId, foName }),
    assignDevices: (campId: string, deviceIds: string[]) => assignDevicesMutation.mutateAsync({ campId, deviceIds }),
    proposeDietitian: (campId: string, dietitianId: string, dietitianName: string, reasons: string[], score: number, by: string) =>
      proposeDietitianMutation.mutateAsync({ campId, dietitianId, dietitianName, reasons, score, by }),
    decideReopen: (campId: string, requestId: string, decision: 'APPROVED' | 'DENIED', by: string, denialReason?: string) =>
      decideReopenMutation.mutateAsync({ campId, requestId, decision, by, denialReason }),
    saveRealPersonDetails: (personId: string, patch: omService.FoDetailsOverlay) => saveRealPersonDetailsMutation.mutateAsync({ personId, patch }),
    saveDietPaymentDetails: (dietitianId: string, patch: Partial<DietitianPaymentDetails>) =>
      saveDietPaymentDetailsMutation.mutateAsync({ dietitianId, patch }),
  } as const
}

export interface DietitianEnrollmentPayload {
  name: string
  phone: string
  email: string
  hq: string
  states: string[]
  specialty?: string
  ratePerCamp?: number
}
