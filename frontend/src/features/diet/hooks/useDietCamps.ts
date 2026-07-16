import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp, CampCancellation, CampConfirmation } from '@/types/camp.types'
import type { MediaItem, OnlineAssessment, TeleConsult, TeleConsultStatus } from '@/features/diet/diet.types'
import * as dietService from '@/features/diet/diet.service'
import { useCampsData } from '@/hooks/useCampsData'

// Camp reads/writes go through the shared useCampsData hook — diet.service.ts
// itself never imports features/camps/ or touches qms.master.camps directly
// (features/camps/ is the sole owner of that store, per CLAUDE.md §3).
export const useDietCamps = () => {
  const queryClient = useQueryClient()
  const { camps: allCamps, addCamp, patchCamp } = useCampsData()
  const { data, isLoading, error } = useQuery({ queryKey: ['diet-own-data'], queryFn: dietService.getData })

  const camps = allCamps.filter((c) => c.type === 'Diet')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['diet-own-data'] })

  const setPatientCountMutation = useMutation({
    mutationFn: ({ campId, patientsDone, patientsExpected, by, note }: { campId: string; patientsDone: number; patientsExpected?: number; by: string; note: string }) =>
      patchCamp(campId, dietService.setPatientCountPatch(patientsDone, patientsExpected, by, note)),
  })

  const markLiveMutation = useMutation({ mutationFn: (campId: string) => patchCamp(campId, dietService.markLivePatch()) })

  const cancelMutation = useMutation({
    mutationFn: ({ camp, reason, notes, slotStartHour }: { camp: Camp; reason: CampCancellation['reason']; notes: string; slotStartHour: number }) =>
      patchCamp(camp.id, dietService.cancelCampPatch(camp, reason, notes, slotStartHour)),
  })

  const closeMutation = useMutation({ mutationFn: (camp: Camp) => patchCamp(camp.id, dietService.closeCampPatch(camp)) })

  const assignTeamMutation = useMutation({
    mutationFn: ({ campId, dietitianId, foId }: { campId: string; dietitianId: string; foId: string }) => {
      const camp = camps.find((c) => c.id === campId)
      return patchCamp(campId, dietService.assignTeamPatch(camp, dietitianId, foId))
    },
  })

  const setConfirmationMutation = useMutation({
    mutationFn: async ({ campId, slot, who, status }: { campId: string; slot: string; who: string; status: CampConfirmation['status'] }) => {
      const camp = camps.find((c) => c.id === campId)
      await patchCamp(campId, dietService.setConfirmationPatch(camp, slot, who, status))
      return dietService.recordConfirmationInReminderLog(campId, slot, who, status)
    },
    onSuccess: invalidate,
  })

  const sendAllMutation = useMutation({ mutationFn: (campId: string) => dietService.sendAllReminders(campId), onSuccess: invalidate })

  const addMediaMutation = useMutation({
    mutationFn: ({ campId, item }: { campId: string; item: MediaItem }) => dietService.addMedia(campId, item),
    onSuccess: invalidate,
  })

  const addAssessmentMutation = useMutation({
    mutationFn: async (assessment: OnlineAssessment) => {
      const camp = camps.find((c) => c.id === assessment.campId)
      const { assessments, campPatch } = await dietService.addAssessment(assessment, camp)
      await patchCamp(assessment.campId, campPatch)
      return assessments
    },
    onSuccess: invalidate,
  })

  const bookTeleMutation = useMutation({ mutationFn: (consult: Omit<TeleConsult, 'id'>) => dietService.bookTeleConsult(consult), onSuccess: invalidate })

  const setTeleStatusMutation = useMutation({
    mutationFn: ({ id, status, notes, plan }: { id: string; status: TeleConsultStatus; notes?: string; plan?: string }) =>
      dietService.setTeleConsultStatus(id, status, notes, plan),
    onSuccess: invalidate,
  })

  return {
    camps,
    dietitians: data?.dietitians ?? [],
    reminders: data?.reminders ?? {},
    media: data?.media ?? {},
    assessments: data?.assessments ?? {},
    teleConsults: data?.teleConsults ?? [],
    isLoading,
    error,
    setPatientCount: (campId: string, patientsDone: number, patientsExpected: number | undefined, by: string, note: string) =>
      setPatientCountMutation.mutateAsync({ campId, patientsDone, patientsExpected, by, note }),
    markLive: (campId: string) => markLiveMutation.mutateAsync(campId),
    cancelCamp: (camp: Camp, reason: CampCancellation['reason'], notes: string, slotStartHour: number) =>
      cancelMutation.mutateAsync({ camp, reason, notes, slotStartHour }),
    closeCamp: (camp: Camp) => closeMutation.mutateAsync(camp),
    assignTeam: (campId: string, dietitianId: string, foId: string) => assignTeamMutation.mutateAsync({ campId, dietitianId, foId }),
    setConfirmation: (campId: string, slot: string, who: string, status: CampConfirmation['status']) =>
      setConfirmationMutation.mutateAsync({ campId, slot, who, status }),
    sendAllReminders: (campId: string) => sendAllMutation.mutateAsync(campId),
    addMedia: (campId: string, item: MediaItem) => addMediaMutation.mutateAsync({ campId, item }),
    addAssessment: (assessment: OnlineAssessment) => addAssessmentMutation.mutateAsync(assessment),
    bookTeleConsult: (consult: Omit<TeleConsult, 'id'>) => bookTeleMutation.mutateAsync(consult),
    setTeleConsultStatus: (id: string, status: TeleConsultStatus, notes?: string, plan?: string) =>
      setTeleStatusMutation.mutateAsync({ id, status, notes, plan }),
    newDietCampRequest: (camp: Camp) => addCamp(camp),
  }
}
