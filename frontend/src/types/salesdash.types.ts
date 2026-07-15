export type SalesRole = 'Key Account Manager' | 'Sales Head'
export type TargetStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'EXCEEDED'
export type ApprovalType = 'CLIENT' | 'DIVISION' | 'MARKETING' | 'BRAND'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type CadenceBand = 'FAST' | 'WEEKLY' | 'BIWEEKLY' | 'SLOW' | 'NONE'

// The current sales quarter — lives here (not sales.mock.ts) so any feature
// can read it through the shared types layer instead of reaching into CRM
// Sales' internal mock file. Mirrors the CLIENTS/DIVISIONS pattern in
// types/client.types.ts.
export const QUARTER = 'Q2 FY26'

export interface SalesRep {
  id: string
  name: string
  role: SalesRole
  reportsTo?: string
  hq: string
  phone: string
  email: string
  joined: string
  relievedOn: string | null
  tone: string
  salaryInr: number
}

export interface RepTarget {
  id: string
  repId: string
  quarter: string
  target: number
  achieved: number
  pipeline: number
  rationale: string
  setBy: string
  setOn: string
  status: TargetStatus
}

export interface RepAssignment {
  repId: string
  clientId: string
  divisionIds: string[]
}

// Which reps are assigned to which clients/divisions — used for KAM
// role-scoping on both the Sales Dashboard and the main Dashboard's Camp
// Report section. Lives here so Dashboard doesn't have to reach into
// features/crm/sales/sales.mock.ts directly.
export const ASSIGNMENTS: RepAssignment[] = [
  { repId: 'p-riya', clientId: 'cli-sun', divisionIds: ['div-sun-cardio', 'div-sun-diabeto'] },
  { repId: 'p-riya', clientId: 'cli-cipla', divisionIds: ['div-cipla-endo'] },
  { repId: 'p-sneha', clientId: 'cli-cipla', divisionIds: ['div-cipla-resp'] },
  { repId: 'p-arjun', clientId: 'cli-abbott', divisionIds: [] },
  { repId: 'p-arjun', clientId: 'cli-drreddys', divisionIds: [] },
]

export interface ApprovalRequest {
  id: string
  type: ApprovalType
  record: Record<string, string>
  status: ApprovalStatus
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  note?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

// Shape of meetings written to localStorage 'qms.sales.meetings' by the
// Appointments module — this dashboard only reads them.
export type SalesMeetingType = 'NEW' | 'FOLLOWUP' | 'PAYMENT' | 'SPOT'
export type SalesMeetingStatus = 'PLANNED' | 'DONE' | 'CANCELLED' | 'BLOCKED' | 'RELEASED'

export interface SalesMeeting {
  id?: string
  ownerName: string
  type: SalesMeetingType
  status: SalesMeetingStatus
  pharmaName: string
  contactName: string
  startAt: string
  endAt: string
  momText?: string
  momSubmittedAt?: string
  linkedLeadId?: string
  agendaPublic?: string
  city?: string
  outcome?: string
  nextSteps?: string
}

// Computed (never persisted) — one row per account/contact thread of meetings.
export interface Journey {
  key: string
  account: string
  contact: string
  ownerName: string
  ownerTone: string
  anchorDate: string
  followupCount: number
  totalTouchpoints: number
  avgGapDays: number
  lastTouch: string
  daysSinceLast: number
  cadenceBand: CadenceBand
  stuck: boolean
  won: boolean
  lost: boolean
  meetings: SalesMeeting[]
}

export interface ActivityItem {
  tone: 'green' | 'amber' | 'rose' | ''
  title: string
  meta: string
}

// Today tab — persisted to 'qms.sales.tasks'. Auto-generated tasks are keyed
// by sourceRef so re-deriving them never creates duplicates (mirrors the
// prototype's ensureAutoTasks()); CUSTOM tasks have no sourceRef.
export type TaskKind = 'MEETING' | 'MOM' | 'LEAD' | 'PO' | 'CUSTOM'
export type TaskStatus = 'PENDING' | 'DONE'

export interface SalesTask {
  id: string
  title: string
  detail: string
  kind: TaskKind
  ownerKey: string
  dueOn: string
  dueTime?: string
  status: TaskStatus
  sourceRef?: string
  snoozedTo?: string
  snoozedTime?: string
  createdAt: string
  doneAt?: string
}

export interface SalesData {
  reps: SalesRep[]
  targets: RepTarget[]
  assignments: RepAssignment[]
  approvals: ApprovalRequest[]
  activityFeed: ActivityItem[]
  meetings: SalesMeeting[]
}
