import { useCreateEntity } from '@/hooks/useCreateEntity'
import { doctorsService } from '@/features/pharma/doctors.service'
import { doctorKeys } from '@/hooks/doctorKeys'
import type { CreateDoctorPayload } from '@/types/doctor.types'

// Mirrors internal-frontend's useCreateDoctor.ts.
export const useCreateDoctor = () => useCreateEntity((payload: CreateDoctorPayload) => doctorsService.createDoctor(payload), doctorKeys.all)
