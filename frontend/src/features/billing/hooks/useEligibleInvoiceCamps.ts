import { useQuery } from '@tanstack/react-query'
import { billingCampsService } from '@/features/billing/billingCamps.service'
import type { CampEntity, CampStatus } from '@/features/camps/campReal.types'

// A camp qualifies for billing only if it is billable-type AND has reached a
// billable lifecycle state — mirrors invoice.service.ts's own
// BILLABLE_CAMP_STATUSES / assertCampEligibleForBilling exactly.
const ELIGIBLE_STATUSES: CampStatus[] = ['closed', 'cancelled_charged']

// Backend has no dedicated "billable, unbilled camps for a project" endpoint
// (confirmed open item in backend/CLAUDE.md) — this pre-filters to
// billingType=billable + eligible status, but whether a camp is ALREADY
// billed on a live invoice can only be confirmed by the create/add call
// itself (a 409). Treat this list as "probably eligible," not authoritative.
//
// KNOWN, DEFERRED LIMITATION: neither GenerateInvoiceDialog nor
// AddCampToInvoiceDialog excludes camps already billed on a DIFFERENT,
// still-live invoice for this same project — this hook has no way to know
// that without an N+1 query (one invoice-line-item lookup per camp), which
// isn't worth adding client-side. No double-billing risk (the backend's
// assertCampBillable 409s on submit either way), but a project's 2nd+
// invoice will surface such conflicts only at submit time, not in the
// picker. Fix properly once the backend adds an "unbilled eligible camps
// for project" endpoint — don't build the N+1 workaround here meanwhile.
//
// Fetches ALL pages for each eligible status, not just page 1 — a project
// can have 45+ eligible camps, and the default list hook's 10-record page
// would silently truncate the picker.
const PAGE_LIMIT = '50'

const fetchAllPagesForStatus = async (projectId: string, status: CampStatus): Promise<CampEntity[]> => {
  const all: CampEntity[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const res = await billingCampsService.searchCamps({
      project: projectId,
      billingType: 'billable',
      status,
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

export const useEligibleInvoiceCamps = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['billing', 'eligible-camps', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const perStatus = await Promise.all(
        ELIGIBLE_STATUSES.map((status) => fetchAllPagesForStatus(projectId, status)),
      )
      return perStatus.flat()
    },
    enabled: !!projectId,
  })
