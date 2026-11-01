import { useEntityQuery } from '@/hooks/useEntityQuery'
import { doctorKeys } from '@/hooks/doctorKeys'
import { doctorsService } from '@/features/pharma/doctors.service'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Mirrors internal-frontend's useDoctorSearch.ts.
export const useDoctorSearch = (query: SearchDoctorQuery, options?: { enabled?: boolean; keepPreviousData?: boolean }) =>
  useEntityQuery(doctorKeys, (q) => doctorsService.searchDoctors(q), query, options)
