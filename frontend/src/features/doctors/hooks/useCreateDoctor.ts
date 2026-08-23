import { useCreateEntity } from '@/hooks/useCreateEntity'
import { doctorsService } from '@/features/doctors/doctors.service'
import { doctorKeys } from '@/features/doctors/hooks/useDoctors'
import type { CreateDoctorPayload } from '@/features/doctors/doctor.types'

export const useCreateDoctor = () => useCreateEntity((payload: CreateDoctorPayload) => doctorsService.createDoctor(payload), doctorKeys.all)
