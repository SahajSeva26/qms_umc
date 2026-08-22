import type { LeadPopulatedRole, LeadPopulatedContact, LeadPopulatedTenant, LeadPopulatedDivision } from '@/features/crm/crm.types'

// salesPerson only ever arrives as the raw ObjectId string before a
// follow-up GET (create/update echo) — search/get-by-id always populate it
// (see LeadEntity's doc comment in crm.types.ts). Callers reading from
// useLeads()'s search-backed list can treat this as "populated or still
// loading", never "permanently a string".
export function roleLabel(role: LeadPopulatedRole | string | undefined): string {
  if (!role || typeof role === 'string') return '—'
  return role.name
}

export function roleCode(role: LeadPopulatedRole | string | undefined): string | undefined {
  if (!role || typeof role === 'string') return undefined
  return role.code
}

// contactPerson switched from a Role to a Contact reference 2026-08-03 —
// Contact has no `code` field (unlike Role), so there is no corresponding
// contactPersonCode helper; callers that used to show roleCode(lead.contactPerson)
// should drop that entirely rather than substitute something else.
export function contactPersonLabel(contact: LeadPopulatedContact | string | undefined): string {
  if (!contact || typeof contact === 'string') return '—'
  return contact.name
}

export function tenantLabel(tenant: LeadPopulatedTenant | string | undefined): string {
  if (!tenant || typeof tenant === 'string') return '—'
  return tenant.name
}

export function divisionLabel(division: LeadPopulatedDivision | string | undefined): string {
  if (!division || typeof division === 'string') return '—'
  return division.name
}
