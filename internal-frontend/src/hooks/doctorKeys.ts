import { createEntityKeys } from '@/hooks/entityQueryKeys'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Distinct from useCampsData.ts's separate 'mockCampDoctors' key.
export const doctorKeys = createEntityKeys<SearchDoctorQuery>('doctors', 'doctor')
