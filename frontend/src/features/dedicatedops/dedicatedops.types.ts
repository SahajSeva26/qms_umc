// Dedicated Ops domain types — long-running FO deployments stationed at
// doctor clinics for a project's duration. Mirrors the vanilla-JS prototype's
// dedicated-data.js exactly (a configurable OVERLAY on top of the shared
// Projects/People masters, never mutating those records — see isDedicated()
// dual-path check: a project is "Dedicated" if this overlay says so, even
// though no seed Project.type is ever literally 'Dedicated').
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export interface ManpowerRequired {
  fo: number
  dietitian: number
  technician: number
  coordinator: number
  manager: number
  supervisor: number
}

export const DEFAULT_MANPOWER: ManpowerRequired = {
  fo: 1, dietitian: 0, technician: 0, coordinator: 1, manager: 0, supervisor: 0,
}

export type ManpowerRoleKey = keyof ManpowerRequired

export const ROLE_LABELS: Record<ManpowerRoleKey, string> = {
  fo: 'Field Officer',
  dietitian: 'Dietitian',
  technician: 'Lab Technician',
  coordinator: 'Coordinator',
  manager: 'Project Manager',
  supervisor: 'Supervisor',
}

export interface Territory {
  state: string
  district: string
  city: string
  zone: string
  region: string
}

export interface SopConfig {
  uploadDeadlineHours: number
  reportTatHours: number
  photoRequired: boolean
  geoTagRequired: boolean
  selfieRequired: boolean
  workingHoursStart: string
  workingHoursEnd: string
  weeklyOff: string
  minScreeningsPerDay: number
  mandatoryFields: string[]
  escalationChain: string[]
  redactPatientIdsForPharma: boolean
}

export const DEFAULT_SOP: SopConfig = {
  uploadDeadlineHours: 12,
  reportTatHours: 24,
  photoRequired: true,
  geoTagRequired: true,
  selfieRequired: true,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  weeklyOff: 'Sun',
  minScreeningsPerDay: 10,
  mandatoryFields: ['patientCode', 'age', 'gender', 'tests', 'risk'],
  escalationChain: ['Coordinator', 'Operations Manager', 'Project Manager'],
  redactPatientIdsForPharma: true,
}

export interface DedicatedProjectConfig {
  type: 'Dedicated'
  manpowerRequired: ManpowerRequired
  deviceRequired: string[]
  territory: Territory
  sopConfig: SopConfig
}

export type ScheduleType = 'mon-sat' | 'daily' | 'mon-fri' | 'alternate'

export interface Assignment {
  foId: string
  projectId: string
  doctorId: string
  clinicLabel: string
  startDate: string
  endDate: string
  scheduleType: ScheduleType
  assignedAt: string
  assignedBy: string
  foName: string
}

export type AttendanceStatus = 'IN_PROGRESS' | 'CLOSED'

export interface AttendanceAudit {
  at: string
  action: string
}

export interface Attendance {
  id: string
  foId: string
  projectId: string
  doctorId: string
  date: string
  checkInAt: string
  checkOutAt: string
  geoLat: number | null
  geoLng: number | null
  selfieUrl: string
  clinicPhotoUrl: string
  clinicPhotoLat?: number
  clinicPhotoLng?: number
  clinicPhotoAccuracy?: number
  status: AttendanceStatus
  audit: AttendanceAudit[]
}

export interface Screening {
  id: string
  attendanceId: string
  foId: string
  projectId: string
  doctorId: string
  date: string
  at: string
  patientCode: string
  age: number
  gender: string
  tests: Record<string, string>
  symptoms: string
  risk: string
  referredToDoctor: boolean
}

// One checklist item in the SOP compliance breakdown — mirrors
// complianceFor()'s literal 6-item checklist exactly (dedicated-data.js:452-459).
export interface ComplianceCheck {
  id: 'checkIn' | 'geo' | 'selfie' | 'clinicPhoto' | 'screenings' | 'checkOut'
  label: string
  ok: boolean
}

export interface ComplianceResult {
  foId: string
  projectId: string
  foName: string
  checks: ComplianceCheck[]
  total: number
  done: number
  pct: number
  overdue: boolean
  overdueHours: number
  ok: boolean
}
