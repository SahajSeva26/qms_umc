import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { MoveAppointmentStagePayload } from '@/types/appointment.types'

// Wraps PATCH /appointments/:id/stage — the ONLY sanctioned way to change an
// appointment's status (create/update never accept a status field). Requires
// a reason, enforced both by the backend's MoveStagePayloadSchema and by the
// caller UI.
export const useMoveAppointmentStage = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveAppointmentStagePayload) => appointmentsRealService.moveAppointmentStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentReal', id] })
      queryClient.invalidateQueries({ queryKey: ['appointmentsReal'] })
    },
  })
}
