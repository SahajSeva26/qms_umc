import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Mirrors `@/features/access-management/role/hooks/useRoles.ts` exactly: a
// thin useQuery wrapper keyed on the raw search query so callers get free
// refetch-on-change.
export const useDoctors = (query: SearchDoctorQuery) => {
  return useQuery({
    queryKey: ['doctors', query],
    queryFn: () => doctorsService.searchDoctors(query),
  })
}
