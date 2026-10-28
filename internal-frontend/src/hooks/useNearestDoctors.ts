import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { NearestDoctorQuery } from '@/types/doctor.types'

// Wraps GET /doctors/nearest — gated server-side to camp:book, division-scoped to the caller's own role.
export const useNearestDoctors = (query: NearestDoctorQuery | null) => {
  return useQuery({
    queryKey: ['doctors', 'nearest', query],
    queryFn: () => doctorsService.nearestDoctors(query as NearestDoctorQuery),
    enabled: !!query && Number.isFinite(query.lng) && Number.isFinite(query.lat),
  })
}
