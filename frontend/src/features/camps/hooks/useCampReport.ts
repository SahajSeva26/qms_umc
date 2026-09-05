import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'

const STALE_TIME_MS = 60_000

// Keyed under campRealKeys.all (['campsReal']) rather than a standalone root —
// every real-camp mutation (create/update/moveStage/allocateFo) already
// invalidates campRealKeys.all, and React Query's prefix-match means that
// invalidation cascades to ['campsReal', 'report'] automatically. A separate
// key here would miss those invalidations and only refresh after staleTime.
export const useCampReport = (enabled = true) =>
  useQuery({
    queryKey: [...campRealKeys.all, 'report'],
    queryFn: () => campsRealService.getCampReport(),
    enabled,
    staleTime: STALE_TIME_MS,
  })
