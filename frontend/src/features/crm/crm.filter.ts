import type { LeadEntity } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'
import { roleLabel, divisionLabel } from '@/features/crm/crm.utils'

export function matchesFilters(lead: LeadEntity, filters: CrmFilterState): boolean {
  if (filters.status && lead.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${lead.title} ${roleLabel(lead.contactPerson)} ${divisionLabel(lead.division)}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

// KAM (sales_rep) role-scoping: only see leads where they are the salesPerson.
//
// LeadEntity.salesPerson is always populated as the full Role document on
// search (see LeadPopulatedRole in crm.types.ts), whose own `.user` field
// stays a raw ObjectId string (Lead's populate doesn't expand Role -> User).
// That string is the User's own _id, which is exactly what AuthUser._id is
// (see useAuth/auth.types.ts) — so comparing salesPerson.user === currentUserId
// is a real, resolvable match, not a lookup that doesn't exist.
export function scopedByOwner(leads: LeadEntity[], currentUserId: string | undefined, isKam: boolean): LeadEntity[] {
  if (!isKam || !currentUserId) return leads
  return leads.filter((l) => typeof l.salesPerson !== 'string' && l.salesPerson.user === currentUserId)
}
