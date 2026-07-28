import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { RespondAppointmentPayload } from '@/types/appointment.types'

// Wraps PATCH /appointments/:id/rsvp. The backend now 409s ("You can only
// respond to a planned appointment...") if the appointment has already left
// 'planned' status by the time the RSVP lands (2026-07-27 merge) — a real,
// expected race (e.g. it got auto-blocked or the sales person moved it on
// while the invite was still pending), not a bug. Callers should surface
// mutation.error's message rather than assume RSVP always succeeds once an
// invite exists.
export const useRespondToAppointment = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RespondAppointmentPayload) => appointmentsRealService.respondToAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentReal', id] })
      queryClient.invalidateQueries({ queryKey: ['appointmentsReal'] })
    },
  })
}
