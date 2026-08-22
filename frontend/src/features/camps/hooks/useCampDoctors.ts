import { useQuery } from '@tanstack/react-query'
import * as campsService from '@/features/camps/camps.service'

// The mock camp-doctor seed list — split out of useCampsShared.ts. Keyed
// 'mockCampDoctors', NOT 'doctors': the real Doctor entity (features/doctors)
// owns the plain 'doctors' key, and a shared key previously cross-invalidated
// both lists on every real doctor mutation (see doctorCacheIsolation.test.tsx).
export const useCampDoctors = () => {
  const { data: doctors = [], isLoading, error } = useQuery({ queryKey: ['mockCampDoctors'], queryFn: campsService.getDoctors })

  return { doctors, isLoading, error }
}
