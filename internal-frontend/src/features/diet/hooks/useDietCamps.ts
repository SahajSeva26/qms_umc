import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp, CampCancellation, CampConfirmation } from '@/types/camp.types'
import type { Dietitian, MediaItem, OnlineAssessment, TeleConsult, TeleConsultStatus } from '@/features/diet/diet.types'
import * as dietService from '@/features/diet/diet.service'
import { useCampsData } from '@/hooks/useCampsData'
import { dietitianDirectory } from '@/features/diet/services/dietitianDirectory.service'
import { dietKeys } from './dietQueryKeys'

// Camp reads/writes go through the shared useCampsData hook — diet.service.ts
// itself never imports features/camps/ or touches qms.master.camps directly
// (features/camps/ is the sole owner of that store, per CLAUDE.md §3).
//
// MUTATION API: every mutation below is returned as its raw TanStack mutation
// object, matching the other Diet hooks (useDietitianRoster, useDietitianRates,
// useDietitianEquipment, …) where callers already write
// `enrollDietitian.mutateAsync(...)` / `requestBca.isPending`.
//
// This hook previously returned bare async functions
// (`markLive: (id) => markLiveMutation.mutateAsync(id)`), which threw away
// `isPending` and `error` and left callers with nothing but a floating promise
// — so eleven UI actions were fire-and-forget and a rejection went nowhere.
// Returning the mutation objects fixes that without inventing a second
// state-management layer on top of TanStack, and gives RBAC one obvious place
// per action to put its check.
//
// Variables stay DOMAIN-level (`{ campId, patientsDone, by, note }`, a Camp, a
// TeleConsult) — no storage concepts cross this boundary, so swapping the
// service bodies for api.* calls later needs no component change.
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

  const upsertProfileMutation = useMutation({
    mutationFn: (profile: Dietitian) => dietService.upsertDietitianProfile(profile),
    // Touches the operational overlay, which the joined directory reads —
    // invalidate the Diet subtree too so the roster-backed views refresh.
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: dietKeys.all })
    },
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

  // Booking a new diet camp. Wrapped locally rather than returning
  // useCampsData's bare `addCamp`, so this screen gets its own isPending/error
  // without changing the shared cross-feature hook. patchCamp/addCamp already
  // own the ['camps'] invalidation — deliberately not repeated here.
  const newCampMutation = useMutation({ mutationFn: (camp: Camp) => addCamp(camp) })

  // The joined directory — canonical identity (roster) enriched with the
  // operational overlay. Camp cards, the Dietitians tab and the detail drawer
  // all read this, so a newly enrolled dietitian resolves everywhere.
  const dietitians = useMemo(
    () => dietitianDirectory(data?.dietitians ?? []),
    [data?.dietitians],
  )

  return {
    camps,
    dietitians,
    /** Overlay-only records, for screens that render operational-only data. */
    dietitianProfiles: data?.dietitians ?? [],
    reminders: data?.reminders ?? {},
    media: data?.media ?? {},
    assessments: data?.assessments ?? {},
    teleConsults: data?.teleConsults ?? [],
    isLoading,
    error,

    // Mutations — raw TanStack objects. Call `.mutateAsync(vars)` and read
    // `.isPending` / `.error`. Callers MUST handle rejection; a failed write
    // now rejects rather than resolving silently.
    setPatientCount: setPatientCountMutation,
    markLive: markLiveMutation,
    cancelCamp: cancelMutation,
    closeCamp: closeMutation,
    assignTeam: assignTeamMutation,
    setConfirmation: setConfirmationMutation,
    sendAllReminders: sendAllMutation,
    addMedia: addMediaMutation,
    upsertDietitianProfile: upsertProfileMutation,
    addAssessment: addAssessmentMutation,
    bookTeleConsult: bookTeleMutation,
    setTeleConsultStatus: setTeleStatusMutation,
    newDietCampRequest: newCampMutation,
  }
}
