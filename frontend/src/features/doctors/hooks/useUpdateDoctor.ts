import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { doctorsService } from '@/features/doctors/doctors.service'
import { doctorKeys } from '@/features/doctors/hooks/useDoctors'
import type { UpdateDoctorPayload } from '@/features/doctors/doctor.types'

export const useUpdateDoctor = (id: string) =>
  useUpdateEntity((payload: UpdateDoctorPayload) => doctorsService.updateDoctor(id, payload), [doctorKeys.detail(id), doctorKeys.all])
