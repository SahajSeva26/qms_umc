import type { LeadEntity } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

// Search matches Title only — Company/Division have their own dedicated filters.
// status/title/fyFrom/fyTo are all also sent as real backend query params
// (CrmPage.tsx, validated + applied server-side in lead.validators.ts/lead.service.ts)
// — kept here too as a harmless, idempotent defense-in-depth check against
// whatever page is already loaded. Matches against `createdAt` (the only date
// every lead reliably has).
//
// fyFrom/fyTo are YYYY-MM-DD, matched against the server's own UTC-day boundary
// (lead.service.ts's startOfUTCDay/endOfUTCDay) — NOT the browser's local timezone.
// Appending a bare "T00:00:00"/"T23:59:59.999" (no "Z") parses in local time, which
// silently shifts the boundary by the user's UTC offset (e.g. in IST, local end-of-day
// is 5.5h BEFORE UTC end-of-day, so a lead created in that trailing window would pass
// the server's filter but get dropped here). Appending "Z" forces UTC parsing to match.
export function matchesFilters(lead: LeadEntity, filters: CrmFilterState): boolean {
  if (filters.status && lead.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    if (!lead.title.toLowerCase().includes(q)) return false
  }
  const createdAt = new Date(lead.createdAt).getTime()
  if (filters.fyFrom && createdAt < new Date(`${filters.fyFrom}T00:00:00.000Z`).getTime()) return false
  if (filters.fyTo && createdAt > new Date(`${filters.fyTo}T23:59:59.999Z`).getTime()) return false
  return true
}
