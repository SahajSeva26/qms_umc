import { useGetEntity } from '@/hooks/useGetEntity'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { appointmentRealKeys } from '@/features/crm/appointments/hooks/useAppointmentsReal'

export const useAppointmentReal = (id: string | undefined) =>
  useGetEntity(appointmentRealKeys.detail, appointmentsRealService.getAppointment, id)
