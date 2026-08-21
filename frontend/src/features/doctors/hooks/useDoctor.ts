import { useGetEntity } from '@/hooks/useGetEntity'
import { doctorsService } from '@/features/doctors/doctors.service'
import { doctorKeys } from '@/features/doctors/hooks/useDoctors'

export const useDoctor = (id: string | undefined) => useGetEntity(doctorKeys.detail, doctorsService.getDoctor, id)
