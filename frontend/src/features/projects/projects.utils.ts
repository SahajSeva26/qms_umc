import type { Camp } from '@/types/camp.types'
import type { UserRole } from '@/types/auth.types'
import type { Project, ProjectKpis, ProjectType } from '@/types/project.types'

// Mirrors the prototype's projects-manager.js roleScopedProjects() — screening
// coordinators/OMs only see Screening+Mixed projects, diet coordinators/OMs
// only see Diet+Mixed; everyone else (sales, admin, etc.) sees every type.
const ROLE_TYPE_SCOPE: Partial<Record<UserRole, ProjectType[]>> = {
  camp_coord: ['Screening', 'Mixed'],
  om_screening: ['Screening', 'Mixed'],
  diet_camp_coord: ['Diet', 'Mixed'],
  om_diet: ['Diet', 'Mixed'],
}

export function roleScopedProjects(projects: Project[], role: UserRole | undefined): Project[] {
  const allowed = role ? ROLE_TYPE_SCOPE[role] : undefined
  if (!allowed) return projects
  return projects.filter((p) => allowed.includes(p.type))
}

const CLOSED_CAMP_STATUS = /CLOSED|COMPLETED|DONE/i

// Prefers the project's own aggregate `campsDone` figure over the live camps
// array: unlike the prototype (whose camps store holds a full execution
// history matching each project's totals), our camps.mock.ts only seeds a
// handful of illustrative sample rows per project. Counting just those would
// under-report progress, so the richer of the two signals wins.
export function executedCamps(project: Project, camps: Camp[]): number {
  const matched = camps.filter((c) => c.projectId === project.id && CLOSED_CAMP_STATUS.test(c.status)).length
  return Math.max(matched, project.campsDone)
}

export function totalPoCamps(project: Project): number {
  const sum = project.pos.reduce((total, po) => total + po.campCount, 0)
  return sum > 0 ? sum : project.totalCamps
}

export function campsProgressPct(project: Project, camps: Camp[]): number {
  const total = totalPoCamps(project)
  if (!total) return 0
  return Math.min(100, Math.round((executedCamps(project, camps) / total) * 100))
}

// Renewal-consumed % — deliberately EXCLUDES void camps from the numerator.
// The prototype's own UI copy promises "void camps are excluded from
// PO-renewal % calculation," but its actual code included them anyway
// (a real contradiction found during research). This port honors the copy.
export function renewalConsumedPct(project: Project): number {
  const total = project.totalCamps
  if (!total) return 0
  return Math.round((project.campsDone / total) * 100)
}

export function projectSearchMatches(project: Project, clientName: string, query: string): boolean {
  if (!query) return true
  const haystack = `${project.id} ${project.name} ${clientName} ${project.poNo} ${project.therapy}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export function computeProjectKpis(projects: Project[], camps: Camp[]): ProjectKpis {
  const now = Date.now()
  const live = projects.filter((p) => p.status === 'LIVE')
  const hold = projects.filter((p) => p.status === 'HOLD')
  const closed = projects.filter((p) => p.status === 'CLOSED')
  const overdue = live.filter((p) => p.endDate && new Date(p.endDate).getTime() < now)
  const atRisk = live.filter((p) => p.healthScore && p.healthScore < 75)
  const renewingIn30d = live.filter((p) => {
    if (!p.endDate) return false
    const delta = new Date(p.endDate).getTime() - now
    return delta > 0 && delta < 30 * 86_400_000
  })

  const projectIds = new Set(projects.map((p) => p.id))
  const scopedCamps = camps.filter((c) => c.projectId && projectIds.has(c.projectId))

  return {
    total: projects.length,
    live: live.length,
    hold: hold.length,
    closed: closed.length,
    renewingIn30d: renewingIn30d.length,
    atRisk: atRisk.length,
    overdue: overdue.length,
    totalCamps: scopedCamps.length,
    closedCamps: scopedCamps.filter((c) => CLOSED_CAMP_STATUS.test(c.status)).length,
  }
}

export function genProjectId(existing: Project[]): string {
  const maxId = existing.reduce((max, p) => {
    const num = parseInt(p.id.replace('PRJ-', ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 450)
  return `PRJ-${maxId + 1}`
}
