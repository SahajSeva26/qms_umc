import { useEntityQuery } from '@/hooks/useEntityQuery'
import { doctorKeys } from '@/hooks/doctorKeys'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { SearchDoctorQuery } from '@/types/doctor.types'

export const useDoctorSearch = (query: SearchDoctorQuery, options?: { enabled?: boolean; keepPreviousData?: boolean }) =>
  useEntityQuery(doctorKeys, (q) => doctorsService.searchDoctors(q), query, options)
