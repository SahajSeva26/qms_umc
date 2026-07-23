import type { ProjectEntity, ProjectType } from '@/types/project.types'

// Real backend ProjectType values that correspond to the app's older
// "Screening"/"Diet" mode split (used by OM/Invoicing/PO-management/Masters
// tabs) — `mixed` shows under both, matching the old mock's intent (a mixed
// project touches both modes) more faithfully than the old single-value
// equality check (`project.type === 'Screening'`) ever did, since `type` is
// now a real array field.
export const SCREENING_MODE_TYPES: ProjectType[] = ['screening_camp', 'mixed']
export const DIET_MODE_TYPES: ProjectType[] = ['diet', 'teleconsultation_diet', 'mixed']

export function isScreeningProject(project: ProjectEntity): boolean {
  return project.type.some((t) => SCREENING_MODE_TYPES.includes(t))
}

// Single source of truth for per-type accent colors — previously duplicated
// verbatim in WizardStep1.tsx, EditProjectModal.tsx, and ProjectTypePill.tsx
// (a real drift risk, and the direct cause of a bug found in live testing:
// EditProjectModal's PickCard usage passed no color, so every type card's
// tile rendered the same default blue regardless of selection state).
export const PROJECT_TYPE_COLOR: Record<ProjectType, string> = {
  screening_camp: '#3b6dff',
  diet: '#14b8a6',
  teleconsultation_diet: '#7c3aed',
  lab_test: '#a855f7',
  mixed: '#f59e0b',
}

// GST math, shared by WizardStep3 (live calculator), WizardStep6 (review
// card), and the New Project Wizard's own save flow — centralized here since
// the old mock duplicated this same formula in 3 separate places.
// valueAfterGST/gstAmount are display-only computed values; the backend
// model has no slot to store either (only valueBeforeGST + gst are real
// fields), so neither is ever sent in a create/update payload.
//
// `gst` has no schema default on the backend (unlike campCost/totalCamps/
// valueBeforeGST, which all default to 0) — a project created without a gst
// value genuinely has gst: undefined server-side. Confirmed live: a project
// created via direct API call with no gst rendered "₹NaN" everywhere its
// value was shown, before this fallback was added.
export function computeGstBreakdown(valueBeforeGST: number, gst: number | undefined) {
  const gstAmount = Math.round((valueBeforeGST || 0) * ((gst || 0) / 100))
  const valueAfterGST = (valueBeforeGST || 0) + gstAmount
  return { gstAmount, valueAfterGST }
}

export function projectTenantName(project: ProjectEntity): string {
  return typeof project.tenant === 'string' ? project.tenant : project.tenant.name
}

export function projectDivisionName(project: ProjectEntity): string {
  return typeof project.division === 'string' ? project.division : project.division.name
}

export function projectSalesRepName(project: ProjectEntity): string {
  return typeof project.salesRep === 'string' ? project.salesRep : project.salesRep.name
}

export function projectSearchMatches(project: ProjectEntity, query: string): boolean {
  if (!query) return true
  const haystack = `${project.name} ${projectTenantName(project)} ${project.therapy}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

// KPI strip. overdue/atRisk/renewingIn30d are now derived from
// projectNearestExpiry (real executionMode.poExpiry/.agreementEndDate data),
// not the old mock's flat startDate/endDate — a project with no date range
// (mail-confirmation mode, or `mode` unset) counts toward none of the three.
export function computeProjectKpis(projects: ProjectEntity[]) {
  const live = projects.filter((p) => p.status === 'live')
  const hold = projects.filter((p) => p.status === 'hold')
  const closed = projects.filter((p) => p.status === 'closed')
  const totalCamps = projects.reduce((sum, p) => sum + (p.totalCamps || 0), 0)

  const now = Date.now()
  let overdue = 0
  let renewingIn30d = 0
  for (const p of projects) {
    const expiry = projectNearestExpiry(p)
    if (!expiry) continue
    const daysLeft = Math.ceil((new Date(expiry).getTime() - now) / 86_400_000)
    if (daysLeft <= 0) overdue += 1
    else if (daysLeft <= 30) renewingIn30d += 1
  }

  return {
    total: projects.length,
    live: live.length,
    hold: hold.length,
    closed: closed.length,
    totalCamps,
    overdue,
    renewingIn30d,
  }
}

// Nearest-expiry date — the one real date-ish signal on the model
// (executionMode.poExpiry / .agreementEndDate).
export function projectNearestExpiry(project: ProjectEntity): string | null {
  if (!project.mode) return null
  return project.mode.poExpiry ?? project.mode.agreementEndDate ?? null
}

// Derived start/end date for the Gantt timeline — the old mock's
// startDate/endDate were never independently tracked fields, they were
// always identical to the PO date range in every mock fixture. The real
// model has no flat date-range field, but PO- and agreement-mode projects
// do carry the same start/end pair nested under `mode`. Mail-confirmation
// mode projects (and any project with `mode` unset) have no date range at
// all and are excluded from the timeline entirely.
export function projectDateRange(project: ProjectEntity): { start: string; end: string } | null {
  if (!project.mode) return null
  const start = project.mode.poDate ?? project.mode.agreementStartDate ?? null
  const end = project.mode.poExpiry ?? project.mode.agreementEndDate ?? null
  if (!start || !end) return null
  return { start, end }
}

// Derived health score — NOT a restoration of the old mock field (that was
// always a hand-picked number with no formula behind it, confirmed by
// inspecting every fixture; there was nothing to reverse-engineer). This is
// a new heuristic built from the one real signal the backend actually
// tracks for renewal risk: days left until poExpiry/agreementEndDate.
// 100 = 90+ days of runway, scaling down to 0 at/after expiry. Projects with
// no date range (mail-confirmation mode, or `mode` unset) have no renewal
// risk to score and return null rather than a fabricated number.
const HEALTH_SCORE_FULL_RUNWAY_DAYS = 90

export function projectHealthScore(project: ProjectEntity): number | null {
  const range = projectDateRange(project)
  if (!range) return null
  const daysLeft = Math.ceil((new Date(range.end).getTime() - Date.now()) / 86_400_000)
  if (daysLeft <= 0) return 0
  return Math.min(100, Math.round((daysLeft / HEALTH_SCORE_FULL_RUNWAY_DAYS) * 100))
}
