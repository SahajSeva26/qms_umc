import { useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { UpdateAppointmentPayload } from '@/types/appointment.types'

export const useUpdateAppointment = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateAppointmentPayload) => appointmentsRealService.updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentReal', id] })
      queryClient.invalidateQueries({ queryKey: ['appointmentsReal'] })
    },
  })
}
