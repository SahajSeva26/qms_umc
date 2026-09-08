import type { ProjectEntity, ProjectType } from '@/types/project.types'
import { CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'

// Frontend-only UI business rule — the backend's daysToBookBefore validator
// is nonnegative-only, no upper bound (project.validators.ts). Not yet a
// true system-wide constraint: a direct API caller can still submit more.
export const MAX_DAYS_TO_BOOK_BEFORE = 120

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

// Mirrors project.routes.ts's real create/update guard exactly
// (`[PROJECT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]`) —
// deliberately excludes `project:create`, which is defined in
// project.constants.ts but never referenced by any route guard (dead
// permission). No default role type holds project:manage today; only
// system:manage or a custom role reaches project create/edit/status-change.
export const PROJECT_WRITE_PERMISSIONS = ['project:manage', 'tenant:manage']

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

// Which Camp Type(s) (screening/diet/lab — TestMaster.campType's own enum,
// campReal.types.ts) a project of each type could plausibly run camps
// against. There is no backend rule linking the two — Camp.type is an
// independent, freely-chosen field on the Camp model, not derived from its
// Project — so this is a frontend-only, advisory mapping, used solely to
// narrow the Project wizard's test picker (WizardStep1.tsx) to tests whose
// own campType is compatible with what this project could plausibly run.
// `mixed` maps to all three: it's explicitly a project that spans more than
// one mode, so it should see the union of every type's tests, not a subset.
export const PROJECT_TYPE_CAMP_TYPES: Record<ProjectType, CampType[]> = {
  screening_camp: ['screening'],
  diet: ['diet'],
  teleconsultation_diet: ['diet'],
  lab_test: ['lab'],
  mixed: [...CAMP_TYPE_VALUES],
}

// Deduped union of allowed camp types across every selected project type —
// empty until at least one project type is picked (WizardStep1.tsx disables
// the test picker entirely until then, mirroring the existing
// therapy-gating rule, rather than showing an unfiltered or empty list that
// would misrepresent "no project type chosen yet" as "no tests available").
export function allowedCampTypesForProjectTypes(types: ProjectType[]): CampType[] {
  return [...new Set(types.flatMap((t) => PROJECT_TYPE_CAMP_TYPES[t]))]
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

// Guard against null even though tenant/division/salesRep are all
// `required: true` in project.model.ts — that only enforces new saves, not
// older documents or a populate() that resolved to null (stale/pre-migration
// reference, deleted doc, etc). Found live 2026-08-04: a real project
// ("Independent audit repro project") crashed the whole detail-drawer page
// with "Cannot read properties of null (reading 'name')" on this exact
// unguarded idiom, applied to marketingContact — same class of bug, these 3
// shared helpers are used across ProjectTable.tsx/ProjectGanttPage.tsx and
// several OM/FO/dedicatedops screens, so fixing here protects all of them.
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

// `new Date('YYYY-MM-DD')` parses as UTC midnight, which can land on the
// previous local calendar day outside UTC+ zones — parse into local
// year/month/day explicitly instead, and reject impossible dates (e.g.
// 2026-02-30) rather than letting them silently roll into the next month.
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

// Exported for createDefaultWizardForm() (wizard.types.ts) — the one other
// place in the app needing "format a Date as a local-calendar YYYY-MM-DD
// string," e.g. today's date for a fresh wizard's PO date default.
export function formatIsoDateLocal(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Used by WizardStep2's Agreement mode (PO expiry / agreement end date
// auto-fill). Returns null (never throws) on an unparseable/empty/impossible
// `iso`, or when `months` isn't a non-negative safe integer — a fractional
// value would silently truncate (Date.setMonth(1.5) behaves like 1) and a
// negative value would produce a real date in the past, neither of which
// matches the "duration in months, backend requires nonnegative integer"
// contract — callers must skip the dependent setField entirely rather than
// write a garbage value into form state.
export function addMonthsIso(iso: string, months: number): string | null {
  const date = parseIsoDateLocal(iso)
  if (!date || !Number.isSafeInteger(months) || months < 0) return null
  date.setMonth(date.getMonth() + months)
  if (Number.isNaN(date.getTime())) return null
  return formatIsoDateLocal(date)
}

// Used by WizardStep2's Agreement mode (start/end date -> duration in
// months). Returns null (never NaN) on either date being
// unparseable/empty/impossible.
export function monthsBetween(startIso: string, endIso: string): number | null {
  const s = parseIsoDateLocal(startIso)
  const e = parseIsoDateLocal(endIso)
  if (!s || !e) return null
  if (e < s) return 0
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()))
}

// Used by WizardStep6's "effective earliest slot" preview. Client-side
// display-only preview — not a server-derived value. The backend's
// effectiveEarliestSlot field is only ever accepted/stored/mapped back as-is
// (project.service.ts), never computed there, and the frontend doesn't submit
// it — so there's no server semantic to match. Computed via local calendar-day
// arithmetic (not `now + days * 86400000` + toISOString, which is UTC-based
// and can show the wrong calendar date near midnight or outside UTC+ zones).
// Never throws: returns '—' for any non-finite, negative, or out-of-range
// `days` value rather than attempting a Date computation that could produce
// an Invalid Date.
export function computeBookingPreview(days: number, now: number): string {
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 0 || days > MAX_DAYS_TO_BOOK_BEFORE) return '—'
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  if (Number.isNaN(date.getTime())) return '—'
  return formatIsoDateLocal(date)
}
