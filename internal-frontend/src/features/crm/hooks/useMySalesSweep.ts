import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { LeadEntity } from '@/types/crm.types'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

// For a lead:search-only caller (no lead:manage), applyOwnScope narrows this server-side to their
// own leads — no date range, since "My Sales Dashboard" shows the caller's whole current portfolio.
async function fetchAllMyLeads(): Promise<LeadEntity[]> {
  const firstPage = await crmService.searchLeads({ limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await fetchRemainingPagesBounded(totalPages, (page) =>
    crmService.searchLeads({ limit: String(PAGE_SIZE), page: String(page) }),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useMySalesSweep = (enabled: boolean) =>
  useQuery({
    queryKey: ['leads', 'my-sales-sweep'],
    queryFn: fetchAllMyLeads,
    enabled,
    staleTime: STALE_TIME_MS,
    retry: false,
  })
