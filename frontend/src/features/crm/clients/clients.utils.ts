import type { Camp } from '@/types/camp.types'
import type {
  ClientInvoice,
  ClientMr,
  ClientProject,
  ClientStatus,
  HierarchyNode,
  HierarchyTier,
  PoConfirmationType,
  PoStatus,
} from '@/types/client.types'

// ---------------------------------------------------------------------------
// Billing / outstanding — invoices join to clients by NAME (not id) to mirror
// the prototype's billing data quirk (see clients.mock.ts).
// ---------------------------------------------------------------------------

export function billingForClient(invoices: ClientInvoice[], clientName: string): number {
  return invoices.filter((i) => i.clientName === clientName).reduce((sum, i) => sum + i.amount, 0)
}

export function outstandingForClient(invoices: ClientInvoice[], clientName: string): number {
  return invoices
    .filter((i) => i.clientName === clientName && i.status !== 'PAID')
    .reduce((sum, i) => sum + i.amount, 0)
}

export function billingForDivision(invoices: ClientInvoice[], clientName: string, divisionId: string): number {
  return invoices
    .filter((i) => i.clientName === clientName && i.divisionId === divisionId)
    .reduce((sum, i) => sum + i.amount, 0)
}

export function outstandingForDivision(invoices: ClientInvoice[], clientName: string, divisionId: string): number {
  return invoices
    .filter((i) => i.clientName === clientName && i.divisionId === divisionId && i.status !== 'PAID')
    .reduce((sum, i) => sum + i.amount, 0)
}

// ---------------------------------------------------------------------------
// Serviceability
// ---------------------------------------------------------------------------

/** Union of an MR's screening/diet/lab cities */
export function serviceableCities(mr: ClientMr): string[] {
  return [
    ...new Set([
      ...mr.serviceability.screening.cities,
      ...mr.serviceability.diet.cities,
      ...mr.serviceability.lab.cities,
    ]),
  ]
}

export function isServiceable(mr: ClientMr): boolean {
  return serviceableCities(mr).length > 0
}

/** Union of serviceable cities across a set of MRs (e.g. a division) */
export function unionServiceableCities(mrs: ClientMr[]): string[] {
  return [...new Set(mrs.flatMap(serviceableCities))]
}

export function parseCityList(raw: string): string[] {
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Camps (read from the Camps module's 'qms.master.camps' store)
// ---------------------------------------------------------------------------

export function campsForDivision(camps: Camp[], divisionId: string): Camp[] {
  return camps.filter((c) => c.divisionId === divisionId)
}

export function campsExecuted(camps: Camp[]): number {
  return camps.filter((c) => c.status === 'CLOSED').length
}

export function campsCancelled(camps: Camp[]): number {
  return camps.filter((c) => c.status === 'CANCELLED' || c.status === 'CANCELLED_CHARGED').length
}

/** Distinct doctors touched by these camps (empty doctorId = not yet mapped) */
export function distinctDoctorCount(camps: Camp[]): number {
  return new Set(camps.map((c) => c.doctorId).filter(Boolean)).size
}

export function mrCampsExecuted(camps: Camp[], mrId: string): number {
  return camps.filter((c) => c.mrId === mrId && c.status === 'CLOSED').length
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

/**
 * Allocates a project's executed camps across its POs in poDate order — the
 * earliest PO absorbs executed camps up to its campCount, the remainder spills
 * into the next PO. Returns a map of poId → executed camps.
 */
export function allocatePoExecution(project: ClientProject): Record<string, number> {
  const sorted = [...project.pos].sort((a, b) => a.poDate.localeCompare(b.poDate))
  let remaining = project.campsDone
  const executed: Record<string, number> = {}
  for (const po of sorted) {
    const take = Math.min(remaining, po.campCount)
    executed[po.id] = take
    remaining -= take
  }
  return executed
}

// ---------------------------------------------------------------------------
// Hierarchy — derived org tree. MRs group under their manager string (ASM),
// one synthetic 'RM · {region}' node per distinct region sits above the ASMs,
// and a single synthetic 'ZM · Unassigned' node roots the division.
// ---------------------------------------------------------------------------

export function buildHierarchy(mrs: ClientMr[]): HierarchyNode {
  const regions = [...new Set(mrs.map((m) => m.region || 'Unassigned'))]
  return {
    id: 'zm-root',
    label: 'Unassigned',
    tier: 'ZM',
    memberCount: mrs.length,
    children: regions.map((region) => {
      const regionMrs = mrs.filter((m) => (m.region || 'Unassigned') === region)
      const managers = [...new Set(regionMrs.map((m) => m.manager || 'Unassigned'))]
      return {
        id: `rm-${region}`,
        label: region,
        tier: 'RM' as const,
        memberCount: regionMrs.length,
        children: managers.map((manager) => {
          const asmMrs = regionMrs.filter((m) => (m.manager || 'Unassigned') === manager)
          return {
            id: `asm-${region}-${manager}`,
            label: manager,
            tier: 'ASM' as const,
            memberCount: asmMrs.length,
            children: asmMrs.map((m) => ({
              id: `mrnode-${m.id}`,
              label: m.name,
              tier: 'MR' as const,
              mrId: m.id,
              memberCount: 1,
              children: [],
            })),
          }
        }),
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Colors / pills
// ---------------------------------------------------------------------------

export function clientStatusPillClass(status: ClientStatus): string {
  if (status === 'ACTIVE') return 'bg-success-soft text-success'
  if (status === 'TRIAL') return 'bg-warning-soft text-warning'
  return 'bg-danger-soft text-danger'
}

/** Tier badge hexes for the division hierarchy tree (tinted pills) */
export const HIERARCHY_TIER_COLORS: Record<HierarchyTier, string> = {
  ZM: '#6d28d9',
  RM: '#0369a1',
  ASM: '#b45309',
  MR: '#047857',
}

/** Matches the Camps module's type accents */
export const PROJECT_TYPE_COLORS: Record<ClientProject['type'], string> = {
  Screening: '#3b6dff',
  Diet: '#10b981',
  Lab: '#8b5cf6',
  Mixed: '#f59e0b',
}

export const CONFIRMATION_TYPE_COLORS: Record<PoConfirmationType, string> = {
  PO: '#3b6dff',
  AGREEMENT: '#8b5cf6',
  MAIL: '#f59e0b',
}

/** ACTIVE renders via the shared success-soft utility classes; COMPLETED uses this tinted neutral. */
export const PO_STATUS_COLORS: Record<PoStatus, string> = {
  ACTIVE: '#10b981',
  COMPLETED: '#64748b',
}
