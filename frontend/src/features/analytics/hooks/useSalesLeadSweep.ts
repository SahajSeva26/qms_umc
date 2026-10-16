import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { LeadEntity } from '@/types/crm.types'
import { fetchRemainingPagesBounded } from '@/features/analytics/analytics.pagedFetch'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

// Meaningful org-wide only for a lead:manage holder (applyOwnScope only lifts scoping for that
// permission). Fully paginated, no silent truncation — same pattern as useFoCampSweep.ts.
async function fetchAllLeadsInPeriod(fyFrom: string, fyTo: string): Promise<LeadEntity[]> {
  const firstPage = await crmService.searchLeads({ fyFrom, fyTo, limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await fetchRemainingPagesBounded(totalPages, (page) =>
    crmService.searchLeads({ fyFrom, fyTo, limit: String(PAGE_SIZE), page: String(page) }),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useSalesLeadSweep = (fyFrom: string, fyTo: string, enabled: boolean) =>
  useQuery({
    queryKey: ['leads', 'sales-analytics-sweep', fyFrom, fyTo],
    queryFn: () => fetchAllLeadsInPeriod(fyFrom, fyTo),
    enabled,
    staleTime: STALE_TIME_MS,
    retry: false,
  })
