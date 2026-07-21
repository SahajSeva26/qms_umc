// Shared dietitian domain types powering the 3 previously-stubbed Field
// Network "Dietitians" screens: Diet Coord Workspace (/diet/approvals),
// Dietitian Payment (/billing/dietitian), Dietitian Profiles (/diet/profiles).
// Ports the prototype's om-data.js dietitian data layer (dietitianRoster,
// dietitianExpense, campPaymentStatus, rankDietitiansForCamp, BCA equipment,
// invites, reopen requests, payment ledger). Deliberately separate from the
// existing features/diet/diet.types.ts's `Dietitian` interface (used by the
// older Diet Camps screen's DietitiansTab/EnrollDietitianModal) — that type
// stays as-is; this file is the richer, prototype-accurate layer the 3 new
// screens read from, converging on the same `diet-XX` ids so a dietitian
// looks consistent across every screen.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export type DietitianEnrollStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ENROLLED'

// A dietitian for the purposes of these 3 screens = either a real roster
// entry (Person, role='Dietitian', already onboarded — `real:true`) or a
// locally-enrolled pipeline record awaiting OM·Diet interview approval
// (`real:false`). Mirrors realDietitians()/loadDietEnroll() concatenation.
export interface DietitianRosterEntry {
  id: string
  real: boolean
  name: string
  phone: string
  email: string
  hq: string
  states: string[]
  specialty?: string
  ratePerCamp: number
  status: DietitianEnrollStatus
  detailsComplete: boolean
  appliedOn: string
  joinedOn?: string
  pan?: string
  aadhar?: string
  address?: string
  resumeUrl?: string
  deviceAlignment?: string[]
  approvedBy?: string
  approvedAt?: string
  rejectedReason?: string
  interview?: { scheduledAt: string | null; conductedAt: string | null; by: string; outcome: string; notes: string }
}

export interface DietitianBankAccount {
  label: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
  branch?: string
  accountType?: 'SAVINGS' | 'CURRENT'
  upi?: string
  chequeUrl?: string
  capturedAt?: string
}

// Per-dietitian overlay (qms.om.dietDetails equivalent) — bank accounts,
// printing charge, target-cost default, BCA equipment. Keyed by dietitian id.
export interface DietitianDetails {
  bankAccounts: DietitianBankAccount[]
  printingChargePerCamp?: number
  targetCostPerCamp?: number
  pan?: string
  aadhar?: string
  hq?: string
  /** Override contact fields — dietitian-profile.js prefers det.email/det.phone
   * over the roster record's own email/phone wherever contact info is shown. */
  email?: string
  phone?: string
}

export interface BcaStockMovement {
  at: string
  by: string
  action: string
  videoUrl?: string
  fromLocation?: string
  toLocation?: string
}

export interface DietitianBcaEquipment {
  owned: boolean
  verified: boolean
  verifiedAt?: string | null
  verifiedBy?: string | null
  requestedAt?: string
  requestedBy?: string
  videoUrl?: string
  stockMovements: BcaStockMovement[]
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

export type InviteResponse = 'ACCEPTED' | 'DECLINED' | null

export interface DietInvite {
  dietitianId: string
  sentAt: string
  sentBy: string
  channel: 'WHATSAPP'
  response: InviteResponse
  respondedAt?: string
  respondedNote?: string
}

export interface DietitianFeedback {
  campId: string
  rating: number
  remarks?: string
  at: string
  by: string
}

export interface DietPayment {
  id: string
  dietitianId: string
  dietitianName: string
  amount: number
  paidOn: string
  paidAt: string
  paidBy: string
  mode: 'BANK' | 'UPI' | 'CHEQUE' | 'CASH'
  ref: string
  campIds: string[]
  notes: string
  documents?: { excel?: string; photos?: string[] }
}

export type ReopenRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export interface CampReopenRequest {
  id: string
  campId: string
  reason: string
  requestedAt: string
  requestedBy: string
  status: ReopenRequestStatus
  decidedAt?: string
  decidedBy?: string
  denialReason?: string
}

export type CampPaymentStatus = 'PENDING' | 'READY' | 'PAID'

export interface DietitianExpense {
  base: number
  travel: number
  ta: number
  printing: number
  travelKm: number
  total: number
}

export interface DietitianRankResult {
  dietitian: DietitianRosterEntry
  score: number
  reasons: string[]
}

export interface DietitianAverageRating {
  avg: number
  count: number
}

export interface DietitianPaymentRollup {
  dietitianId: string
  dietitianName: string
  totalCamps: number
  completedCamps: number
  reportPendingCamps: number
  eligibleAmount: number
  upcomingAmount: number
  paidAmount: number
  toBePaid: number
  bankComplete: boolean
}

export interface DietitianProjectBreakdown {
  project: { id: string; name: string }
  camps: number
  paidAmt: number
  pendingAmt: number
}

// Full data bundle for the Dietitian Profiles screen — dietitianProfileBundle().
export interface DietitianProfileBundle {
  dietitian: DietitianRosterEntry
  details: DietitianDetails
  equipment: { bca: DietitianBcaEquipment }
  camps: import('@/types/camp.types').Camp[]
  closed: import('@/types/camp.types').Camp[]
  upcoming: import('@/types/camp.types').Camp[]
  payments: DietPayment[]
  paymentRollup: DietitianPaymentRollup
  rateHistory: DietitianRateEntry[]
  feedbacks: (DietitianFeedback & { camp: import('@/types/camp.types').Camp })[]
  averageRating: DietitianAverageRating | null
  byProject: DietitianProjectBreakdown[]
}
