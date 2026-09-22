import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import type { NearestDoctorQuery } from '@/types/doctor.types'

// Wraps GET /doctors/nearest — a lookup tool, not live-as-you-type: `query` stays null until the
// user submits a search. `enabled` guards on lng/lat both being finite so this never fires with
// NaN query params while the lookup form is still being filled in.
export const useNearestDoctors = (query: NearestDoctorQuery | null) => {
  return useQuery({
    queryKey: ['doctors', 'nearest', query],
    queryFn: () => doctorsService.nearestDoctors(query as NearestDoctorQuery),
    enabled: !!query && Number.isFinite(query.lng) && Number.isFinite(query.lat),
  })
}
