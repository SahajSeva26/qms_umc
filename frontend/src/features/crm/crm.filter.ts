import type { LeadEntity } from '@/features/crm/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

// Search matches Title only — Company/Division have their own dedicated filters.
export function matchesFilters(lead: LeadEntity, filters: CrmFilterState): boolean {
  if (filters.status && lead.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    if (!lead.title.toLowerCase().includes(q)) return false
  }
  return true
}
