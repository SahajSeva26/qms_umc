import { useQuery } from '@tanstack/react-query'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { AppointmentReportQuery } from '@/types/appointment.types'

// Query key starts with 'appointmentsReal' (not 'appointments') to match
// appointmentRealKeys.all — every mutation hook in this feature invalidates
// that key on success, which prefix-matches this query too.
export const useAppointmentReport = (query: AppointmentReportQuery, enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['appointmentsReal', 'report', query],
    queryFn: () => appointmentsRealService.getAppointmentReport(query),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
