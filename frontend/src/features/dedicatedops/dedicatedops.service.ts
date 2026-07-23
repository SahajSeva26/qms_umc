import type {
  DedicatedProjectConfig, Assignment, Attendance, Screening, ManpowerRequired, Territory,
  ComplianceResult, ComplianceCheck, ScheduleType, SopConfig,
} from '@/features/dedicatedops/dedicatedops.types'
import { DEFAULT_MANPOWER, DEFAULT_SOP } from '@/features/dedicatedops/dedicatedops.types'
import { SEED_PROJECT_CONFIG, SEED_ASSIGNMENTS, SEED_ATTENDANCE, SEED_SCREENINGS } from '@/features/dedicatedops/dedicatedops.mock'
import type { ProjectEntity } from '@/types/project.types'

// TODO: replace with real API calls once backend endpoints exist.
// Storage keys mirror the prototype's dedicated-data.js exactly
// (qms.dedicated.* prefix) — a configurable overlay, never mutating the
// shared Projects master directly (see isDedicated()'s dual-path check).
const KEYS = {
  PROJ: 'qms.dedicated.projectConfig',
  ASN: 'qms.dedicated.assignments',
  ATT: 'qms.dedicated.attendance',
  SCR: 'qms.dedicated.screenings',
}

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}

function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // demo persistence only
  }
}

function loadProjectConfig(): Record<string, DedicatedProjectConfig> {
  return load(KEYS.PROJ, SEED_PROJECT_CONFIG)
}
function loadAssignments(): Record<string, Assignment> {
  return load(KEYS.ASN, SEED_ASSIGNMENTS)
}
function loadAttendance(): Attendance[] {
  return load(KEYS.ATT, SEED_ATTENDANCE)
}
function loadScreenings(): Screening[] {
  return load(KEYS.SCR, SEED_SCREENINGS)
}

// isDedicated() — the overlay config's own `type` flag is the real signal.
// The old mock's second check (base project's own `type` field literally
// saying "dedicated") never had a real backend equivalent — the real
// ProjectType enum (screening_camp/diet/teleconsultation_diet/lab_test/
// mixed) has no "dedicated" value at all, so that branch is dropped rather
// than kept as permanently-dead code.
export function isDedicated(project: ProjectEntity, configs: Record<string, DedicatedProjectConfig>): boolean {
  const cfg = configs[project.id]
  return cfg?.type === 'Dedicated'
}

export interface DedicatedOpsData {
  projectConfigs: Record<string, DedicatedProjectConfig>
  assignments: Record<string, Assignment>
  attendance: Attendance[]
  screenings: Screening[]
}

export async function getData(): Promise<DedicatedOpsData> {
  return {
    projectConfigs: loadProjectConfig(),
    assignments: loadAssignments(),
    attendance: loadAttendance(),
    screenings: loadScreenings(),
  }
}

export async function convertProjectToDedicated(
  projectId: string,
  opts: { manpowerRequired: Partial<ManpowerRequired>; territory: Partial<Territory> }
): Promise<Record<string, DedicatedProjectConfig>> {
  const configs = loadProjectConfig()
  configs[projectId] = {
    type: 'Dedicated',
    manpowerRequired: { ...DEFAULT_MANPOWER, ...opts.manpowerRequired },
    deviceRequired: configs[projectId]?.deviceRequired ?? [],
    territory: { state: '', district: '', city: '', zone: '', region: '', ...opts.territory },
    sopConfig: { ...DEFAULT_SOP },
  }
  persist(KEYS.PROJ, configs)
  return configs
}

export async function setSopConfig(projectId: string, patch: Partial<SopConfig>): Promise<Record<string, DedicatedProjectConfig>> {
  const configs = loadProjectConfig()
  const existing = configs[projectId]
  if (!existing) return configs
  configs[projectId] = { ...existing, sopConfig: { ...existing.sopConfig, ...patch } }
  persist(KEYS.PROJ, configs)
  return configs
}

export async function resetSopConfig(projectId: string): Promise<Record<string, DedicatedProjectConfig>> {
  const configs = loadProjectConfig()
  const existing = configs[projectId]
  if (!existing) return configs
  configs[projectId] = { ...existing, sopConfig: { ...DEFAULT_SOP } }
  persist(KEYS.PROJ, configs)
  return configs
}

// assignFoToProject — keyed 1:1 by foId, so an FO can only be on one project
// at a time (overwrites any prior assignment, matching the prototype exactly).
export async function assignFoToProject(
  foId: string,
  projectId: string,
  doctorId: string,
  opts: { clinicLabel: string; startDate: string; scheduleType: ScheduleType; foName: string }
): Promise<Record<string, Assignment>> {
  const assignments = loadAssignments()
  assignments[foId] = {
    foId, projectId, doctorId,
    clinicLabel: opts.clinicLabel,
    startDate: opts.startDate,
    endDate: '',
    scheduleType: opts.scheduleType,
    assignedAt: new Date().toISOString(),
    assignedBy: 'Operations Manager',
    foName: opts.foName,
  }
  persist(KEYS.ASN, assignments)
  return assignments
}

export async function unassignFo(foId: string): Promise<Record<string, Assignment>> {
  const assignments = loadAssignments()
  delete assignments[foId]
  persist(KEYS.ASN, assignments)
  return assignments
}

export function fosOnProject(assignments: Record<string, Assignment>, projectId: string): Assignment[] {
  return Object.values(assignments).filter((a) => a.projectId === projectId)
}

// complianceFor() — the literal 6-item SOP-gating checklist + overdue rule,
// ported exactly from dedicated-data.js:440-471.
export function complianceFor(
  foId: string,
  assignments: Record<string, Assignment>,
  attendance: Attendance[],
  screenings: Screening[],
  sopConfig: SopConfig,
  dateIso: string
): ComplianceResult | null {
  const assignment = assignments[foId]
  if (!assignment) return null
  const att = attendance.find((a) => a.foId === foId && a.date === dateIso)
  const checkedIn = !!att?.checkInAt
  const checkedOut = !!att?.checkOutAt
  const hasGeo = !!(att?.geoLat && att?.geoLng)
  const hasSelfie = !!att?.selfieUrl
  const hasClinicPhoto = !!att?.clinicPhotoUrl
  const todaysScreenings = screenings.filter((s) => s.foId === foId && s.date === dateIso).length
  const meetsScreenings = todaysScreenings >= sopConfig.minScreeningsPerDay

  const checks: ComplianceCheck[] = [
    { id: 'checkIn', label: 'FO checked in', ok: checkedIn },
    { id: 'geo', label: 'GPS captured at check-in', ok: !sopConfig.geoTagRequired || hasGeo },
    { id: 'selfie', label: 'Check-in selfie', ok: !sopConfig.selfieRequired || hasSelfie },
    { id: 'clinicPhoto', label: 'Doctor clinic photo uploaded', ok: !sopConfig.photoRequired || hasClinicPhoto },
    { id: 'screenings', label: `Min ${sopConfig.minScreeningsPerDay} patient screenings`, ok: meetsScreenings },
    { id: 'checkOut', label: 'FO checked out', ok: checkedOut },
  ]

  const total = checks.length
  const done = checks.filter((c) => c.ok).length
  const pct = Math.round((100 * done) / total)

  const overdueHours = checkedIn && att?.checkInAt ? (Date.now() - new Date(att.checkInAt).getTime()) / 3_600_000 : 0
  const overdue = checkedIn && overdueHours > sopConfig.uploadDeadlineHours && done < total

  return {
    foId, projectId: assignment.projectId, foName: assignment.foName,
    checks, total, done, pct, overdue, overdueHours, ok: done === total,
  }
}

export function toCsv<T extends object>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(',')
  const lines = rows.map((r) =>
    columns.map((c) => {
      const v = r[c]
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
