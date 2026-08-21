import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { appointmentRealKeys } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import type { UpdateAppointmentPayload } from '@/types/appointment.types'

export const useUpdateAppointment = (id: string) =>
  useUpdateEntity(
    (payload: UpdateAppointmentPayload) => appointmentsRealService.updateAppointment(id, payload),
    [appointmentRealKeys.detail(id), appointmentRealKeys.all],
  )
