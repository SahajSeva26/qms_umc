import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import type { SearchAppointmentQuery } from '@/types/appointment.types'

export const appointmentRealKeys = createEntityKeys<SearchAppointmentQuery>('appointmentsReal', 'appointmentReal')

export const useAppointmentsReal = (query: SearchAppointmentQuery, options?: { enabled?: boolean }) =>
  useEntityQuery(appointmentRealKeys, (q) => appointmentsRealService.searchAppointments(q), query, options)
