import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { doctorsService } from '@/features/pharma/doctors.service'
import { doctorKeys } from '@/hooks/doctorKeys'
import type { UpdateDoctorPayload } from '@/types/doctor.types'

// Mirrors internal-frontend's useUpdateDoctor.ts.
export const useUpdateDoctor = (id: string) =>
  useUpdateEntity((payload: UpdateDoctorPayload) => doctorsService.updateDoctor(id, payload), [doctorKeys.detail(id), doctorKeys.all])
