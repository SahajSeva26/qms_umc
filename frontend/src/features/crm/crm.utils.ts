import type { LeadPopulatedRole, LeadPopulatedTenant, LeadPopulatedDivision } from '@/types/crm.types'

// contactPerson/salesPerson only ever arrive as the raw ObjectId string
// before a follow-up GET (create/update echo) — search/get-by-id always
// populate them (see LeadEntity's doc comment in crm.types.ts). Callers
// reading from useLeads()'s search-backed list can treat this as "populated
// or still loading", never "permanently a string".
export function roleLabel(role: LeadPopulatedRole | string | undefined): string {
  if (!role || typeof role === 'string') return '—'
  return role.name
}

export function roleCode(role: LeadPopulatedRole | string | undefined): string | undefined {
  if (!role || typeof role === 'string') return undefined
  return role.code
}

export function tenantLabel(tenant: LeadPopulatedTenant | string | undefined): string {
  if (!tenant || typeof tenant === 'string') return '—'
  return tenant.name
}

export function divisionLabel(division: LeadPopulatedDivision | string | undefined): string {
  if (!division || typeof division === 'string') return '—'
  return division.name
}
