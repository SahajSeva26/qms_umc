import { useCreateEntity } from '@/hooks/useCreateEntity'
import { doctorsService } from '@/features/doctors/doctors.service'
import { doctorKeys } from '@/hooks/doctorKeys'
import type { CreateDoctorPayload } from '@/types/doctor.types'

export const useCreateDoctor = () => useCreateEntity((payload: CreateDoctorPayload) => doctorsService.createDoctor(payload), doctorKeys.all)
