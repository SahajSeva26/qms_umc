import { useQuery } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'

export const useAppointmentReal = (id: string | undefined) => {
  return useQuery({
    queryKey: ['appointmentReal', id],
    queryFn: () => appointmentsRealService.getAppointment(id as string),
    enabled: !!id,
  })
}
