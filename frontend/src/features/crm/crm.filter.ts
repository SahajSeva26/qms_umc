import type { LeadEntity } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

// Search matches Title only — Company/Division have their own dedicated filters.
// status/title are also sent as real backend query params (CrmPage.tsx) — kept
// here too as a harmless, idempotent defense-in-depth check.
//
// fyFrom/fyTo filter client-side against whatever page is already loaded — the
// backend doesn't accept these as real search params yet (see SearchLeadQuery's
// own note), so this is a working stand-in until it does. Matches against
// `createdAt` (the only date every lead reliably has).
//
// fyFrom/fyTo are YYYY-MM-DD in the BROWSER'S LOCAL timezone (DatePicker.tsx
// formats with date-fns in local time) — comparing them as bare strings against
// `createdAt` (a UTC ISO timestamp) silently shifts the boundary by the user's
// UTC offset (e.g. ~5.5h early for IST). Parse both sides into real Date
// instants instead so the comparison means what the user actually picked.
export function matchesFilters(lead: LeadEntity, filters: CrmFilterState): boolean {
  if (filters.status && lead.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    if (!lead.title.toLowerCase().includes(q)) return false
  }
  const createdAt = new Date(lead.createdAt).getTime()
  if (filters.fyFrom && createdAt < new Date(`${filters.fyFrom}T00:00:00`).getTime()) return false
  if (filters.fyTo && createdAt > new Date(`${filters.fyTo}T23:59:59.999`).getTime()) return false
  return true
}
