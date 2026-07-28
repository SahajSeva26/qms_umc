import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { MoveAppointmentStagePayload } from '@/types/appointment.types'

// Wraps PATCH /appointments/:id/stage — the ONLY sanctioned way to change an
// appointment's status (create/update never accept a status field). Requires
// a reason, enforced both by the backend's MoveStagePayloadSchema and by the
// caller UI. blocked->released additionally requires appointment:manage
// specifically (enforced server-side in the service, not the route guard) —
// callers should surface the resulting 403 rather than pre-guess it.
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
