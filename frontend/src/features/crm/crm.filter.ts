import type { Lead } from '@/types/lead.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

export function matchesFilters(lead: Lead, filters: CrmFilterState): boolean {
  if (filters.stage && lead.stage !== filters.stage) return false
  if (filters.therapy && lead.therapy !== filters.therapy) return false
  if (filters.owner && lead.owner !== filters.owner) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${lead.account} ${lead.contact} ${lead.id} ${lead.therapy} ${lead.geography}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

// KAM (sales_rep) role-scoping: only see leads they own.
export function scopedByOwner(leads: Lead[], userFirstName: string | undefined, isKam: boolean): Lead[] {
  if (!isKam || !userFirstName) return leads
  return leads.filter((l) => l.owner.toLowerCase().startsWith(userFirstName.toLowerCase()))
}
