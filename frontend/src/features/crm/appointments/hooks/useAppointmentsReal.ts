import { useQuery } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { SearchAppointmentQuery } from '@/types/appointment.types'

// Thin useQuery wrapper keyed on the raw search query, mirroring useCampsReal.ts exactly.
export const useAppointmentsReal = (query: SearchAppointmentQuery) => {
  return useQuery({
    queryKey: ['appointmentsReal', query],
    queryFn: () => appointmentsRealService.searchAppointments(query),
  })
}
