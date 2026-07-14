// Project Management + Project Gantt domain types.
// Mirrors the vanilla-JS prototype's projects-manager.js / gantt.js shapes.
// TODO: entirely mock/frontend-only — no backend endpoints exist for projects yet.
//
// NOTE: this is a deliberately separate, richer entity from ClientProject
// (types/client.types.ts), which Client Management already persists to
// 'qms.master.projects'. This module persists to its own key
// ('qms.master.projects.full') to avoid corrupting Client Management's
// already-shipped PO feature with an incompatible shape. Both are seeded from
// the same CLIENTS/DIVISIONS master data so they read as one system.

export type ProjectStatus = 'LIVE' | 'HOLD' | 'CLOSED'

export interface ProjectStatusMeta {
  id: ProjectStatus
  label: string
  color: string
}

export const PROJECT_STATUSES: ProjectStatusMeta[] = [
  { id: 'LIVE', label: 'Live', color: '#10b981' },
  { id: 'HOLD', label: 'Hold', color: '#f59e0b' },
  { id: 'CLOSED', label: 'Closed', color: '#94a3b8' },
]

export type ProjectType = 'Screening' | 'Diet' | 'TeleDiet' | 'Lab' | 'Mixed'

export interface ProjectTypeMeta {
  id: ProjectType
  label: string
  icon: string
  color: string
}

export const PROJECT_TYPES: ProjectTypeMeta[] = [
  { id: 'Screening', label: 'Screening', icon: 'stethoscope', color: '#3b6dff' },
  { id: 'Diet', label: 'Diet', icon: 'apple', color: '#14b8a6' },
  { id: 'TeleDiet', label: 'Teleconsultation Diet', icon: 'video', color: '#7c3aed' },
  { id: 'Lab', label: 'Lab', icon: 'flask-conical', color: '#a855f7' },
  { id: 'Mixed', label: 'Mixed', icon: 'shuffle', color: '#f59e0b' },
]

export type MixedSubType = 'Screening' | 'Diet' | 'DedicatedFO' | 'Lab'

export const MIXED_SUBTYPES: { id: MixedSubType; label: string }[] = [
  { id: 'Screening', label: 'Screening Camp' },
  { id: 'Diet', label: 'Diet' },
  { id: 'DedicatedFO', label: 'Dedicated FO' },
  { id: 'Lab', label: 'Lab' },
]

export type ExecutionMode = 'PO' | 'AGREEMENT' | 'MAIL'

export interface ExecutionModeMeta {
  id: ExecutionMode
  label: string
  icon: string
  color: string
}

export const EXECUTION_MODES: ExecutionModeMeta[] = [
  { id: 'PO', label: 'PO Based', icon: 'file-badge', color: '#3b6dff' },
  { id: 'AGREEMENT', label: 'Agreement Based', icon: 'file-text', color: '#14b8a6' },
  { id: 'MAIL', label: 'Mail Confirmation', icon: 'mail', color: '#a855f7' },
]

// Therapy list is a hardcoded dropdown in the prototype, not master-data driven.
export const THERAPIES = [
  'Cardiology', 'Diabetes', 'Pulmonology', 'Endocrine', 'Orthopedics', 'Gynaecology',
  'Neurology', 'Hepatology', 'Nephrology', 'Ophthalmology', 'Dermatology', 'Oncology',
  'Pediatrics', 'Wellness',
]

export const CAMP_TIME_SLOTS: { id: string; label: string }[] = [
  { id: '8-9', label: '8 am–9 am' },
  { id: '9-13', label: '9 am–1 pm' },
  { id: '10-14', label: '10 am–2 pm' },
  { id: '11-15', label: '11 am–3 pm' },
  { id: '16-17', label: '4 pm–5 pm' },
  { id: '18-22', label: '6 pm–10 pm' },
]

export type GoLiveScope = 'STATE' | 'CITY' | 'PAN_INDIA'

export const STATES_INDIA = [
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK',
  'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ', 'SK',
  'TG', 'TN', 'TR', 'UP', 'UK', 'WB',
]

export type BookingRole = 'MR' | 'ASM' | 'RM' | 'HO'

export const BOOKING_ROLES: { id: BookingRole; label: string; desc: string }[] = [
  { id: 'MR', label: 'MR', desc: 'Books own assigned doctors only' },
  { id: 'ASM', label: 'ASM', desc: 'Own MRs + serviceability flags · books on their behalf' },
  { id: 'RM', label: 'RM', desc: 'Own ASMs + their MRs + serviceability' },
  { id: 'HO', label: 'HO', desc: 'Books on behalf of anyone in the company' },
]

export type ReportCadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'

export const REPORT_CADENCES: { id: ReportCadence; label: string }[] = [
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'BIWEEKLY', label: '15 days' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly' },
  { id: 'SEMIANNUAL', label: 'Six-monthly' },
  { id: 'ANNUAL', label: 'Yearly' },
]

// Full pointer pool for the "Report format" ordered picker — sequence matters,
// so this is the available pool, not the default selection (see DEFAULT_WIZARD_FORM).
export const REPORT_POINTERS = [
  'Camps executed', 'Patients screened', 'Doctor count', 'Conversion %', 'Cancellation count',
  'Cancellation cost', 'NPS score', 'AR aging', 'Revenue MTD', 'Margin %', 'Risk bifurcation',
  'Therapy mix', 'Geography mix', 'Top performing FOs',
]

export interface CancellationPolicy {
  freeHoursPrior: number
  pctAllowed: number
  pctDeducted: number
}

export interface ProjectPo {
  id: string
  poNo: string
  poDate: string
  poExpiry: string
  campCount: number
  value: number
  status: 'ACTIVE' | 'COMPLETED'
}

export interface DietChartLink {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export interface VoidCamp {
  id: string
  date: string
  doctorName: string
  city: string
  mailUrl: string
  approvedBy: string
  notes: string
  approvedAt: string
}

export interface ProjectStatusChange {
  from: ProjectStatus
  to: ProjectStatus
  reason: string
  at: string
  by: string
}

export interface UploadedDoc {
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface Project {
  id: string
  name: string
  clientId: string
  /** null when the project has no division — matches Camp.divisionId's sentinel */
  divisionId: string | null
  type: ProjectType
  mixedSubTypes: MixedSubType[]
  therapy: string
  testsConducted: string[]

  bookingLeadDays: number
  status: ProjectStatus
  executionMode: ExecutionMode

  poNo: string
  poDate: string
  poExpiry: string
  agreementNo: string
  agreementStart: string
  agreementExpiry: string
  agreementDurationMonths: number
  agreementDoc: UploadedDoc | null
  mailRef: string
  mailAttachmentDoc: UploadedDoc | null

  campCost: number
  totalCamps: number
  campsDone: number
  valueBeforeGst: number
  gstPct: number
  gstAmount: number
  valueAfterGst: number
  additionalPatientCost: number

  campTimeSlots: string[]
  cancellationPolicy: CancellationPolicy
  goLiveScope: GoLiveScope
  goLiveDetails: string[]
  bookingHierarchy: BookingRole[]

  salesPersonId: string
  coordinatorId: string
  marketingContactId: string
  paymentTerms: string
  renewalReminderPct: number
  reportCadence: ReportCadence
  reportFormat: string[]
  tats: string
  sops: string
  dietCharts: DietChartLink[]

  voidCamps: VoidCamp[]
  closeReason: string

  healthScore: number
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string

  statusHistory: ProjectStatusChange[]
  pos: ProjectPo[]
}

export interface ProjectKpis {
  total: number
  live: number
  hold: number
  closed: number
  renewingIn30d: number
  atRisk: number
  overdue: number
  totalCamps: number
  closedCamps: number
}
