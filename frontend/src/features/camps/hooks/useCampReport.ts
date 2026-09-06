import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'

const STALE_TIME_MS = 60_000

// Keyed under campRealKeys.all rather than a standalone root — React Query's
// prefix-match means every real-camp mutation's invalidation cascades here too.
export const useCampReport = (enabled = true) =>
  useQuery({
    queryKey: [...campRealKeys.all, 'report'],
    queryFn: () => campsRealService.getCampReport(),
    enabled,
    staleTime: STALE_TIME_MS,
  })
