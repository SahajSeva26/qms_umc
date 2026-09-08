import type { LeadEntity } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

// Search matches Title only — Company/Division have their own dedicated filters.
//
// fyFrom/fyTo filter client-side against whatever page is already loaded — the
// backend doesn't accept these as real search params yet (see SearchLeadQuery's
// own note), so this is a working stand-in until it does. Matches against
// `createdAt` (the only date every lead reliably has).
export function matchesFilters(lead: LeadEntity, filters: CrmFilterState): boolean {
  if (filters.status && lead.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    if (!lead.title.toLowerCase().includes(q)) return false
  }
  if (filters.fyFrom && lead.createdAt < filters.fyFrom) return false
  if (filters.fyTo && lead.createdAt > `${filters.fyTo}T23:59:59.999Z`) return false
  return true
}
