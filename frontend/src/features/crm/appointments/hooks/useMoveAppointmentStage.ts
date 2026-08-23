import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { appointmentRealKeys } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import type { MoveAppointmentStagePayload } from '@/features/crm/appointments/appointment.types'

// The only way to change an appointment's status — create/update never accept a status field.
export const useMoveAppointmentStage = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveAppointmentStagePayload) => appointmentsRealService.moveAppointmentStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: appointmentRealKeys.all })
    },
  })
}
