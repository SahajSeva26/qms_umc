import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { CampEntity } from '@/types/campReal.types'
import type { AnalyticsFilters } from '@/types/analytics.types'
import { todayLocalDateString, periodStartLocalDateString } from '@/features/analytics/analytics.localDate'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

// Meaningful org-wide only for a camp:manage holder — see useFoAnalyticsAccess.ts's own comment.
// Callers without it get no call fired at all.
async function fetchAllCampsInPeriod(periodDays: AnalyticsFilters['periodDays']): Promise<CampEntity[]> {
  const dateFrom = periodDays === 'all' ? undefined : periodStartLocalDateString(periodDays)
  const dateTo = todayLocalDateString()

  const firstPage = await campsRealService.searchCamps({ dateFrom, dateTo, report: 'true', limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await fetchRemainingPagesBounded(totalPages, (page) =>
    campsRealService.searchCamps({ dateFrom, dateTo, report: 'true', limit: String(PAGE_SIZE), page: String(page) }),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useFoCampSweep = (periodDays: AnalyticsFilters['periodDays'], enabled: boolean) =>
  useQuery({
    queryKey: ['camps', 'fo-analytics-sweep', periodDays],
    queryFn: () => fetchAllCampsInPeriod(periodDays),
    enabled,
    staleTime: STALE_TIME_MS,
  })
