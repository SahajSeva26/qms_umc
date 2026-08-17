import { useQuery } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { SearchAppointmentQuery } from '@/types/appointment.types'

// Thin useQuery wrapper keyed on the raw search query.
// `enabled` (default true) lets a caller skip the fetch entirely.
export const useAppointmentsReal = (query: SearchAppointmentQuery, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['appointmentsReal', query],
    queryFn: () => appointmentsRealService.searchAppointments(query),
    enabled: options?.enabled ?? true,
  })
}
