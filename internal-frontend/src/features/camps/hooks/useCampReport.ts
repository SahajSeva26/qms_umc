import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { CampStatus } from '@/types/campReal.types'

const STALE_TIME_MS = 60_000

// Keyed under campRealKeys.all so every real-camp mutation's invalidation cascades here too.
// Optional `status` scopes the whole report (incl. byType) to one tab.
export const useCampReport = (enabled = true, status?: CampStatus) =>
  useQuery({
    queryKey: [...campRealKeys.all, 'report', status ?? 'all'],
    queryFn: () => campsRealService.getCampReport(status),
    enabled,
    staleTime: STALE_TIME_MS,
  })
