import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { appointmentRealKeys } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import type { RespondAppointmentPayload } from '@/types/appointment.types'

// Backend 409s if the appointment has left 'planned' status by the time the RSVP lands;
// callers should surface mutation.error's message rather than assume RSVP always succeeds.
export const useRespondToAppointment = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RespondAppointmentPayload) => appointmentsRealService.respondToAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: appointmentRealKeys.all })
    },
  })
}
