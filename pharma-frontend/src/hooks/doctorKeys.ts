import { createEntityKeys } from '@/hooks/entityQueryKeys'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Mirrors internal-frontend's doctorKeys.ts.
export const doctorKeys = createEntityKeys<SearchDoctorQuery>('doctors', 'doctor')
