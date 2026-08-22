import { useCreateEntity } from '@/hooks/useCreateEntity'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { appointmentRealKeys } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import type { CreateAppointmentPayload } from '@/features/crm/appointments/appointment.types'

export const useCreateAppointment = () =>
  useCreateEntity((payload: CreateAppointmentPayload) => appointmentsRealService.createAppointment(payload), appointmentRealKeys.all)
