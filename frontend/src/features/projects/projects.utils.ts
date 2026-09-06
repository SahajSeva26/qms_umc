import type { ProjectEntity, ProjectType } from '@/types/project.types'
import { CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'

// Frontend-only UI cap — the backend's daysToBookBefore validator is
// nonnegative-only with no upper bound, so a direct API caller can submit more.
export const MAX_DAYS_TO_BOOK_BEFORE = 120

// react-hook-form's `valueAsNumber` turns a cleared input into NaN in live
// state, propagating into cross-field math (e.g. "₹NaN" in the GST preview).
export function asZeroWhenBlank(value: unknown): number {
  const parsed = Number(value)
  return value === '' || !Number.isFinite(parsed) ? 0 : parsed
}

// Corresponds to the app's Screening/Diet mode split used by OM/Invoicing/
// PO-management/Masters tabs — `mixed` shows under both.
export const SCREENING_MODE_TYPES: ProjectType[] = ['screening_camp', 'mixed']
export const DIET_MODE_TYPES: ProjectType[] = ['diet', 'teleconsultation_diet', 'mixed']

export function isScreeningProject(project: ProjectEntity): boolean {
  return project.type.some((t) => SCREENING_MODE_TYPES.includes(t))
}

// Mirrors project.routes.ts's create/update guard exactly — deliberately
// excludes `project:create`, which no route guard ever references.
export const PROJECT_WRITE_PERMISSIONS = ['project:manage', 'tenant:manage']

// Single source of truth for per-type accent colors, shared by WizardStep1,
// EditProjectModal, and ProjectTypePill.
export const PROJECT_TYPE_COLOR: Record<ProjectType, string> = {
  screening_camp: '#3b6dff',
  diet: '#14b8a6',
  teleconsultation_diet: '#7c3aed',
  lab_test: '#a855f7',
  mixed: '#f59e0b',
}

// No backend rule links Project type to Camp type — this is a frontend-only,
// advisory mapping used to narrow the wizard's test picker.
export const PROJECT_TYPE_CAMP_TYPES: Record<ProjectType, CampType[]> = {
  screening_camp: ['screening'],
  diet: ['diet'],
  teleconsultation_diet: ['diet'],
  lab_test: ['lab'],
  mixed: [...CAMP_TYPE_VALUES],
}

// Deduped union of allowed camp types across every selected project type —
// empty until at least one project type is picked.
export function allowedCampTypesForProjectTypes(types: ProjectType[]): CampType[] {
  return [...new Set(types.flatMap((t) => PROJECT_TYPE_CAMP_TYPES[t]))]
}

// `gst` has no schema default (unlike campCost/totalCamps/valueBeforeGST), so
// a project created without one genuinely has gst: undefined server-side.
export function computeGstBreakdown(valueBeforeGST: number, gst: number | undefined) {
  const gstAmount = Math.round((valueBeforeGST || 0) * ((gst || 0) / 100))
  const valueAfterGST = (valueBeforeGST || 0) + gstAmount
  return { gstAmount, valueAfterGST }
}

// Guards against null even though these fields are `required: true` in
// project.model.ts — that only enforces new saves, not a stale populate().
export function projectTenantName(project: ProjectEntity): string {
  if (!project.tenant) return '—'
  return typeof project.tenant === 'string' ? project.tenant : project.tenant.name
}

export function projectDivisionName(project: ProjectEntity): string {
  if (!project.division) return '—'
  return typeof project.division === 'string' ? project.division : project.division.name
}

export function projectSalesRepName(project: ProjectEntity): string {
  if (!project.salesRep) return '—'
  return typeof project.salesRep === 'string' ? project.salesRep : project.salesRep.name
}

// overdue/renewingIn30d are derived from projectNearestExpiry — a project
// with no date range (mail-confirmation mode, or `mode` unset) counts toward neither.
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

export function projectNearestExpiry(project: ProjectEntity): string | null {
  if (!project.mode) return null
  return project.mode.poExpiry ?? project.mode.agreementEndDate ?? null
}

// PO- and agreement-mode projects carry a start/end pair nested under `mode`;
// mail-confirmation mode (or `mode` unset) has no date range.
export function projectDateRange(project: ProjectEntity): { start: string; end: string } | null {
  if (!project.mode) return null
  const start = project.mode.poDate ?? project.mode.agreementStartDate ?? null
  const end = project.mode.poExpiry ?? project.mode.agreementEndDate ?? null
  if (!start || !end) return null
  return { start, end }
}

// Heuristic built from days left until poExpiry/agreementEndDate: 100 = 90+
// days of runway, scaling to 0 at/after expiry. No date range means no score (null).
const HEALTH_SCORE_FULL_RUNWAY_DAYS = 90

export function projectHealthScore(project: ProjectEntity): number | null {
  const range = projectDateRange(project)
  if (!range) return null
  const daysLeft = Math.ceil((new Date(range.end).getTime() - Date.now()) / 86_400_000)
  if (daysLeft <= 0) return 0
  return Math.min(100, Math.round((daysLeft / HEALTH_SCORE_FULL_RUNWAY_DAYS) * 100))
}

// `new Date('YYYY-MM-DD')` parses as UTC midnight, which can land on the
// previous local calendar day outside UTC+ zones — parse local y/m/d instead.
function parseIsoDateLocal(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function formatIsoDateLocal(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Returns null (never throws) on an unparseable `iso` or invalid `months` —
// callers must skip the dependent setField rather than write a garbage value.
export function addMonthsIso(iso: string, months: number): string | null {
  const date = parseIsoDateLocal(iso)
  if (!date || !Number.isSafeInteger(months) || months < 0) return null
  date.setMonth(date.getMonth() + months)
  if (Number.isNaN(date.getTime())) return null
  return formatIsoDateLocal(date)
}

// Returns null (never NaN) if either date is unparseable.
export function monthsBetween(startIso: string, endIso: string): number | null {
  const s = parseIsoDateLocal(startIso)
  const e = parseIsoDateLocal(endIso)
  if (!s || !e) return null
  if (e < s) return 0
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()))
}

// Client-side display-only preview — the backend never computes
// effectiveEarliestSlot itself. Never throws: returns '—' for invalid `days`.
export function computeBookingPreview(days: number, now: number): string {
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 0 || days > MAX_DAYS_TO_BOOK_BEFORE) return '—'
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  if (Number.isNaN(date.getTime())) return '—'
  return formatIsoDateLocal(date)
}
