import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { CampEntity } from '@/types/campReal.types'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 2000

// closed + cancelled_charged — same "conducted" convention as DashboardPage.tsx's EXECUTED_CAMP_STATUSES.
const CONDUCTED_CAMP_STATUSES = new Set(['closed', 'cancelled_charged'])

// Builds YYYY-MM-DD from local date parts, NOT toISOString() (which converts to UTC first and
// would shift the date for any timezone ahead of UTC, e.g. India before 05:30 IST or on Jan 1).
function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfYearISO(): string {
  return toLocalDateString(new Date(new Date().getFullYear(), 0, 1))
}

function todayISO(): string {
  return toLocalDateString(new Date())
}

// Paginates until every camp dated this calendar year is fetched (a single request would silently
// truncate past PAGE_SIZE). Throws on any page failure rather than returning a partial list.
async function fetchAllConductedCampsThisYear(): Promise<CampEntity[]> {
  const dateFrom = startOfYearISO()
  const dateTo = todayISO()

  const firstPage = await campsRealService.searchCamps({ dateFrom, dateTo, limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const allItems =
    totalPages <= 1
      ? items
      : [
          items,
          ...(
            await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, i) =>
                campsRealService.searchCamps({ dateFrom, dateTo, limit: String(PAGE_SIZE), page: String(i + 2) }),
              ),
            )
          ).map((p) => p.data.items),
        ].flat()

  return allItems.filter((c) => CONDUCTED_CAMP_STATUSES.has(c.status))
}

export const useCampMonthlyReportData = (enabled = true) =>
  useQuery({
    queryKey: ['camps', 'monthly-report', startOfYearISO()],
    queryFn: fetchAllConductedCampsThisYear,
    enabled,
    staleTime: STALE_TIME_MS,
  })
