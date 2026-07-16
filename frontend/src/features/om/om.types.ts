// Ops Manager domain types. Mirrors the prototype's om-data.js exactly.
// OM never owns Camps/People/Clients/Devices/Projects — those are shared
// masters (see hooks/useCampsData.ts, hooks/usePeopleData.ts,
// hooks/useClientsDataShared.ts, hooks/useProjectsDataShared.ts). OM's own
// bounded context: enrollment pipelines, per-person details overlay,
// expense/remuneration overlay, dietitian rate history, payment ledger,
// invites, equipment, feedback, submission-token/reopen workflow, audit.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export type EnrollStatus = 'PENDING' | 'ENROLLED' | 'REJECTED'

// Unified roster entry — real staff (from the shared People master) merged
// with pipeline enrollments (OM-owned), mirrors foRoster()/dietitianRoster()
// exactly (om-data.js:154/236: realFos().concat(loadEnroll())). `real: true`
// entries are already-employed staff (status always 'ENROLLED', full write
// access via the People master); `real: false` are pending applicants.
export interface RosterEntry {
  id: string
  real: boolean
  name: string
  phone: string
  email: string
  hq: string
  states: string[]
  status: EnrollStatus | DietitianEnrollStatus
  detailsComplete: boolean
  appliedOn: string
  joinedOn?: string
  specialty?: string
  ratePerCamp?: number
  pan?: string
  aadhar?: string
  address?: string
  // Real-FO-only performance fields (om-data.js:146-148)
  salaryInr?: number
  campsPerDay?: number
  machinesAssigned?: string[]
  occupancyPct?: number
  efficiencyPct?: number
  feedbackAvg?: number
}

export interface FoEnrollment {
  id: string
  name: string
  phone: string
  email: string
  hq: string
  states: string[]
  appliedOn: string
  detailsComplete: boolean
  status: EnrollStatus
  pan?: string
  aadhar?: string
  address?: string
  joinedOn?: string
  real?: boolean
}

export type DietitianEnrollStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface DietitianInterview {
  scheduledAt?: string
  conductedAt?: string
  by?: string
  outcome?: 'APPROVED' | 'REJECTED'
  notes?: string
}

export interface DietitianEnrollment {
  id: string
  name: string
  phone: string
  email: string
  hq: string
  states: string[]
  specialty?: string
  ratePerCamp?: number
  appliedOn: string
  detailsComplete: boolean
  pan?: string
  aadhar?: string
  address?: string
  joinedOn?: string
  real?: boolean
  bankAccounts: DietitianBankAccount[]
  resumeUrl: string
  deviceAlignment: string[]
  interview?: DietitianInterview
  approvedBy?: string
  approvedAt?: string
  rejectedReason?: string
  status: DietitianEnrollStatus
}

export interface DietitianBankAccount {
  label?: string
  accountName: string
  accountNumber: string
  ifsc: string
  branch?: string
  accountType?: 'SAVINGS' | 'CURRENT'
  upi?: string
  chequeUrl: string
  capturedAt?: string
}

// Payment-tab-owned bank/printing details store (qms.om.dietDetails in the
// prototype) — distinct from the enrollment pipeline's own bankAccounts,
// since a dietitian's payout details can be edited long after onboarding.
export interface DietitianPaymentDetails {
  bankAccounts: DietitianBankAccount[]
  printingChargePerCamp?: number
}

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'

export interface ExpenseBreakdown {
  travel: number
  daily: number
  misc: number
  total: number
  distanceKm: number
}

export interface DietitianExpenseBreakdown {
  base: number
  ta: number
  printing: number
  travelKm: number
  total: number
}

export interface DietitianRateEntry {
  remuneration: number
  ta: number
  printing: number
  targetCost: number
  reason: string
  setAt: string
  setBy: string
  campId: string
}

export type PaymentMode = 'BANK' | 'UPI' | 'CHEQUE' | 'CASH'

export interface DietitianPayment {
  id: string
  paidOn: string
  paidAt: string
  paidBy: string
  mode: PaymentMode
  ref: string
  campIds: string[]
  notes: string
  amount: number
}

export type InviteResponse = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface DietitianInvite {
  dietitianId: string
  dietitianName: string
  sentAt: string
  sentBy: string
  channel: 'WHATSAPP'
  response: InviteResponse
  respondedAt?: string
  note?: string
}

export interface BcaStockMovement {
  at: string
  by: string
  action: string
  videoUrl?: string
  photoUrl?: string
  fromLocation?: string
  toLocation?: string
}

export interface DietitianEquipment {
  bca: {
    owned: boolean
    verified: boolean
    verifiedAt?: string
    verifiedBy?: string
    videoUrl?: string
    requestedAt?: string
    requestedBy?: string
    stockMovements: BcaStockMovement[]
  }
}

export interface CampFeedback {
  campId: string
  rating: number
  remarks: string
  at: string
  by: string
}

export type ReopenStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export interface ReopenRequest {
  id: string
  reason: string
  requestedAt: string
  requestedBy: string
  status: ReopenStatus
  decidedAt?: string
  decidedBy?: string
  denialReason?: string
}

// Normalized camp status bucket — campStatus() (om-data.js:86-97).
export type OmCampStatus = 'COMPLETED' | 'ONGOING' | 'CANCELLED' | 'CANCELLED_CHARGED' | 'REQUESTED' | 'OVERDUE' | 'UPCOMING'

export interface DietitianRankResult {
  dietitianId: string
  score: number
  reasons: string[]
}

export interface AuditIssue {
  campId: string
  photosMissing: boolean
  reportMissing: boolean
  countMissing: boolean
  issueCount: number
}
