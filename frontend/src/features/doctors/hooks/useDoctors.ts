import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Distinct from useCampsData.ts's separate 'mockCampDoctors' key.
export const doctorKeys = createEntityKeys<SearchDoctorQuery>('doctors', 'doctor')

// `enabled` lets a caller skip the request entirely (e.g. a tab that's not visible).
// `keepPreviousData` opts a page-driven caller into TanStack's placeholderData.
export const useDoctors = (query: SearchDoctorQuery, options?: { enabled?: boolean; keepPreviousData?: boolean }) =>
  useEntityQuery(doctorKeys, (q) => doctorsService.searchDoctors(q), query, options)
