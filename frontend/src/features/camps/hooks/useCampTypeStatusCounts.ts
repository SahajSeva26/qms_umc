import { useQueries } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { CampStatus, CampType } from '@/types/campReal.types'

const STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

export interface CampTypeStatusCounts {
  counts: Record<CampStatus, number>
  total: number
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

// GET /camps/report has no `type` filter, so this fires one lightweight `limit=1` search per
// status (scoped by type) and reads `.count` off each instead.
export const useCampTypeStatusCounts = (type: CampType, enabled = true): CampTypeStatusCounts => {
  const queries = useQueries({
    queries: STATUSES.map((status) => ({
      queryKey: campRealKeys.list({ type, status, limit: '1' }),
      queryFn: () => campsRealService.searchCamps({ type, status, limit: '1' }),
      enabled,
    })),
  })

  const counts: Record<CampStatus, number> = {
    requested: 0, confirmed: 0, live: 0, closed: 0, cancelled: 0, cancelled_charged: 0,
  }
  let total = 0
  queries.forEach((query, i) => {
    const count = query.data?.data?.count ?? 0
    counts[STATUSES[i]] = count
    total += count
  })

  return {
    counts,
    total,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => void q.refetch()),
  }
}
