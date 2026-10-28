import type { ProjectEntity, ProjectType } from '@/types/project.types'

export interface CompanyDivisionRow {
  tenantId: string
  tenantName: string
  // Divisions represented by this rep's OWN loaded projects only — NOT the company's true full
  // division roster (a division with none of this rep's projects won't appear; that would need a
  // division:search call per company, which this temporary dashboard intentionally does not add —
  // see the component's own "represented in my projects" label).
  divisionCount: number
  projectCount: number
  divisionNames: string[]
  // Σ campCost × totalCamps across this company's projects — a contracted/planned figure, NOT
  // actual invoiced/paid revenue (invoice:* is architecturally unreachable for Sales Head/Rep —
  // see salesDashboard.kpis.ts's own real-vs-dropped notes for the same finding elsewhere).
  committedValue: number
  // Only counts projects whose executionMode.mode is 'po' — agreement/mail-confirmation projects
  // structurally never have a PO, so they're excluded rather than counted as "0 pending" (which
  // would misleadingly read as "fully covered").
  poPendingCount: number
}

function tenantIdentity(project: ProjectEntity): { id: string; name: string } | null {
  if (!project.tenant || typeof project.tenant === 'string') return null
  return { id: project.tenant._id ?? project.tenant.code, name: project.tenant.name }
}

function divisionName(project: ProjectEntity): string | null {
  if (!project.division || typeof project.division === 'string') return null
  return project.division.name
}

function hasPendingPo(project: ProjectEntity): boolean {
  if (project.executionMode?.mode !== 'po') return false
  const purchaseOrders = project.executionMode.po?.purchaseOrders ?? []
  return purchaseOrders.length === 0
}

// "My companies + divisions" — real, derived entirely from the already-fetched useProjectsDataShared()
// list (own-scoped server-side by Project.salesRep for a non-manage actor, see project.service.ts
// applyOwnScope). Division chips are only the divisions represented by this rep's own projects — a
// real but incomplete subset of the company's true full division roster (see review note: adding a
// division:search call per company to close that gap was explicitly rejected for this temporary
// dashboard, to avoid an N-request fan-out).
export function buildCompanyDivisionRows(projects: ProjectEntity[]): CompanyDivisionRow[] {
  const byTenant = new Map<string, CompanyDivisionRow>()

  for (const project of projects) {
    const identity = tenantIdentity(project)
    if (!identity) continue
    const row = byTenant.get(identity.id) ?? {
      tenantId: identity.id, tenantName: identity.name, divisionCount: 0, projectCount: 0,
      divisionNames: [], committedValue: 0, poPendingCount: 0,
    }
    row.projectCount++
    row.committedValue += project.campCost * project.totalCamps
    if (hasPendingPo(project)) row.poPendingCount++
    const name = divisionName(project)
    if (name && !row.divisionNames.includes(name)) {
      row.divisionNames.push(name)
      row.divisionCount++
    }
    byTenant.set(identity.id, row)
  }

  return Array.from(byTenant.values()).sort((a, b) => b.projectCount - a.projectCount)
}

export interface ProjectTypeBillingRow {
  type: ProjectType
  count: number
  committedValue: number
}

// "Project types · count + billing" — same real per-type grouping as buildProjectTiles
// (salesDashboard.kpis.ts), extended with Σ campCost × totalCamps per type. A multi-type project
// counts toward (and contributes its full committed value to) every type it carries.
export function buildProjectTypeBillingRows(projects: ProjectEntity[]): ProjectTypeBillingRow[] {
  const byType = new Map<ProjectType, { count: number; committedValue: number }>()

  for (const project of projects) {
    const value = project.campCost * project.totalCamps
    for (const type of project.type) {
      const row = byType.get(type) ?? { count: 0, committedValue: 0 }
      row.count++
      row.committedValue += value
      byType.set(type, row)
    }
  }

  return Array.from(byType.entries()).map(([type, row]) => ({ type, ...row }))
}
