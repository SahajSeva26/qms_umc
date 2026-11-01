import { useQuery } from '@tanstack/react-query'
import { billingCampsService } from '@/features/billing/billingCamps.service'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

// Mirrors invoice.service.ts's BILLABLE_CAMP_STATUSES — not authoritative for already-billed
// camps (that's only confirmed by the create/add call's 409); see backend/CLAUDE.md.
const ELIGIBLE_STATUSES: CampStatus[] = ['closed', 'cancelled_charged']

// Fetches ALL pages per status — a project can have 45+ eligible camps, more than one default page.
const PAGE_LIMIT = '50'

export interface EligibleCampsDateRange {
  dateFrom?: string
  dateTo?: string
}

const fetchAllPagesForStatus = async (projectId: string, status: CampStatus, dateRange?: EligibleCampsDateRange): Promise<CampEntity[]> => {
  const all: CampEntity[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const res = await billingCampsService.searchCamps({
      project: projectId,
      billingType: 'billable',
      status,
      ...(dateRange?.dateFrom ? { dateFrom: dateRange.dateFrom } : {}),
      ...(dateRange?.dateTo ? { dateTo: dateRange.dateTo } : {}),
      page: String(page),
      limit: PAGE_LIMIT,
    })
    const items = res.data?.items ?? []
    all.push(...items)
    const count = res.data?.count ?? 0
    hasMore = items.length > 0 && all.length < count
    page += 1
  }

  return all
}

// dateRange is optional and passed through to the real, server-filtered GET /camps dateFrom/dateTo.
export const useEligibleInvoiceCamps = (projectId: string | undefined, dateRange?: EligibleCampsDateRange) =>
  useQuery({
    queryKey: ['billing', 'eligible-camps', projectId, dateRange?.dateFrom ?? '', dateRange?.dateTo ?? ''],
    queryFn: async () => {
      if (!projectId) return []
      const perStatus = await Promise.all(
        ELIGIBLE_STATUSES.map((status) => fetchAllPagesForStatus(projectId, status, dateRange)),
      )
      return perStatus.flat()
    },
    enabled: !!projectId,
  })
