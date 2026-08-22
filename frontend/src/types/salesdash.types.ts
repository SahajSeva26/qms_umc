export type SalesRole = 'Key Account Manager' | 'Sales Head'
export type TargetStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'EXCEEDED'
export type ApprovalType = 'CLIENT' | 'DIVISION' | 'MARKETING' | 'BRAND'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type CadenceBand = 'FAST' | 'WEEKLY' | 'BIWEEKLY' | 'SLOW' | 'NONE'

// The current sales quarter — lives here so any feature can read it through
// the shared types layer, mirroring the CLIENTS/DIVISIONS pattern.
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

// Sales rep roster — lives here so DashboardPage's super_admin block (via
// useSalesDataShared) can read it through the shared types layer.
export const REPS: SalesRep[] = [
  {
    id: 'p-riya',
    name: 'Riya Mehta',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Mumbai',
    phone: '+91 98200 11223',
    email: 'riya@qms.health',
    joined: '2024-06-10',
    relievedOn: null,
    tone: 'teal',
    salaryInr: 75000,
  },
  {
    id: 'p-sneha',
    name: 'Sneha Nair',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Bengaluru',
    phone: '+91 98450 33441',
    email: 'sneha@qms.health',
    joined: '2024-11-02',
    relievedOn: null,
    tone: 'violet',
    salaryInr: 72000,
  },
  {
    id: 'p-rohit',
    name: 'Rohit Sharma',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Delhi NCR',
    phone: '+91 98100 55667',
    email: 'rohit@qms.health',
    joined: '2023-08-19',
    relievedOn: '2026-05-04',
    tone: 'rose',
    salaryInr: 70000,
  },
  {
    id: 'p-arjun',
    name: 'Arjun Kapoor',
    role: 'Sales Head',
    hq: 'Mumbai',
    phone: '+91 98920 77889',
    email: 'arjun@qms.health',
    joined: '2022-04-01',
    relievedOn: null,
    tone: 'brand',
    salaryInr: 140000,
  },
]

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

// Quarterly rep targets — same rationale as REPS above.
export const TARGETS: RepTarget[] = [
  {
    id: 't-riya',
    repId: 'p-riya',
    quarter: QUARTER,
    target: 12000000,
    achieved: 9420000,
    pipeline: 4200000,
    rationale: 'Mumbai cluster has 2.1× faster conversion; carry Sun+Cipla anchor accounts',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'ON_TRACK',
  },
  {
    id: 't-sneha',
    repId: 'p-sneha',
    quarter: QUARTER,
    target: 9000000,
    achieved: 5400000,
    pipeline: 2600000,
    rationale: 'Bengaluru respiratory portfolio is ramping; Cipla Resp division is the anchor bet',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'AT_RISK',
  },
  {
    id: 't-rohit',
    repId: 'p-rohit',
    quarter: QUARTER,
    target: 6000000,
    achieved: 6420000,
    pipeline: 800000,
    rationale: 'Reduced load for notice period; close out committed Delhi NCR renewals only',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'EXCEEDED',
  },
  {
    id: 't-arjun',
    repId: 'p-arjun',
    quarter: QUARTER,
    target: 18000000,
    achieved: 14100000,
    pipeline: 6800000,
    rationale: 'Head target covers Abbott + Dr Reddy\'s strategic accounts and overflow escalations',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'ON_TRACK',
  },
]

export interface RepAssignment {
  repId: string
  clientId: string
  divisionIds: string[]
}

// Which reps are assigned to which clients/divisions — used for KAM
// role-scoping on the Sales Dashboard and main Dashboard's Camp Report.
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
