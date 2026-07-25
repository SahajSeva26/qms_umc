import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { SearchDoctorQuery } from '@/types/doctor.types'

// Mirrors `@/features/access-management/role/hooks/useRoles.ts` exactly: a
// thin useQuery wrapper keyed on the raw search query so callers get free
// refetch-on-change. `enabled` (default true) lets a caller skip the request
// entirely — e.g. DoctorsPage.tsx's Inactive-tab query, which is pointless
// for a caller without doctor:manage since the backend silently substitutes
// status=active for that query instead of honoring 'inactive'.
export const useDoctors = (query: SearchDoctorQuery, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['doctors', query],
    queryFn: () => doctorsService.searchDoctors(query),
    enabled: options?.enabled ?? true,
  })
}
