// ERP-Screening domain types — the Verification/PO/Invoicing/Revenue
// Assurance/Masters tabs, screening-only (data-screening-only in the
// prototype). Mirrors erp-screening.js + the billing-engine.js pieces it
// reads. The ONLY new entity this module introduces is Verification —
// everything else (Camps/Projects/Clients/Devices) is a shared master.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export type VerificationStatusId =
  | 'ACCEPTED' | 'REJECTED' | 'HOLD' | 'NEED_CLARIFICATION'
  | 'INCOMPLETE_DOCS' | 'TECHNICAL_ISSUE' | 'DUPLICATE' | 'CLIENT_DISPUTE'

export interface VerificationStatusMeta {
  id: VerificationStatusId
  label: string
  tone: string
  billable: boolean
  reasonRequired: boolean
  technical?: boolean
}

export const VSTATUS: VerificationStatusMeta[] = [
  { id: 'ACCEPTED', label: 'Accepted', tone: '#10b981', billable: true, reasonRequired: false },
  { id: 'REJECTED', label: 'Rejected', tone: '#f43f5e', billable: false, reasonRequired: true },
  { id: 'HOLD', label: 'Hold', tone: '#f59e0b', billable: false, reasonRequired: true },
  { id: 'NEED_CLARIFICATION', label: 'Need Clarification', tone: '#f59e0b', billable: false, reasonRequired: true },
  { id: 'INCOMPLETE_DOCS', label: 'Incomplete Documentation', tone: '#f59e0b', billable: false, reasonRequired: true },
  { id: 'TECHNICAL_ISSUE', label: 'Technical Issue (QMS)', tone: '#ef4444', billable: false, reasonRequired: true, technical: true },
  { id: 'DUPLICATE', label: 'Duplicate Entry', tone: '#94a3b8', billable: false, reasonRequired: true },
  { id: 'CLIENT_DISPUTE', label: 'Client Dispute', tone: '#a855f7', billable: false, reasonRequired: true },
]

export function vMeta(id: VerificationStatusId): VerificationStatusMeta {
  return VSTATUS.find((v) => v.id === id) ?? VSTATUS[0]
}

export interface VerificationHistoryEntry {
  at: string
  by: string
  status: string
  note?: string
}

export type ReinstateStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'

export interface VerificationReinstate {
  status: ReinstateStatus
  by: string
  at: string
  decidedBy?: string
  decidedAt?: string
  note?: string
}

export interface VerificationRecord {
  status: VerificationStatusId
  reviewed: boolean
  reason?: string
  rootCause?: string
  correctiveAction?: string
  responsible?: string
  decidedBy?: string
  decidedAt?: string
  history: VerificationHistoryEntry[]
  reinstate: VerificationReinstate | null
}

export const DEFAULT_VERIFICATION: VerificationRecord = { status: 'ACCEPTED', reviewed: false, history: [], reinstate: null }

// ── Invoicing (billing-engine.js's shape, read-only surface here) ──────────
export type InvoiceLineKind = 'CAMP' | 'CANCELLED_CHARGED' | 'ADDL_PATIENT' | 'FOC'

export interface InvoiceLine {
  campId: string
  kind: InvoiceLineKind
  desc: string
  qty: number
  rate: number
  amount: number
  focReason?: string
}

export type InvoiceStage = 'GENERATED' | 'APPROVED' | 'GRN_DONE' | 'PAID'
export type InvoicePaymentStatus = 'OUTSTANDING' | 'CLEARED'

export interface Invoice {
  id: string
  projectId: string
  clientId: string
  poNo: string
  generatedBy: string
  generatedOn: string
  rate: number
  addlRate: number
  lines: InvoiceLine[]
  campIds: string[]
  voidCampIds: string[]
  focCampIds: string[]
  campCount: number
  additionalPatients: number
  subtotal: number
  total: number
  stage: InvoiceStage
  paymentStatus: InvoicePaymentStatus
  paymentClearedOn?: string
  paymentRef?: string
}

export type CampBillingStatus = 'BILLED'

export interface PoStats {
  poQty: number
  consumed: number
  remaining: number
  completed: number
  accepted: number
  rejected: number
  blocked: number
  pendingVer: number
  cancelledCharged: number
  cancelledNon: number
  poValue: number
  rate: number
  consumedValue: number
  remainingValue: number
}

export type LeakageCategoryKey = 'NOT_BILLED' | 'TECHNICAL' | 'REJECTED' | 'HOLD' | 'DOCS' | 'DISPUTE'

export interface LeakageCategory {
  key: LeakageCategoryKey
  label: string
  recoverable: boolean
  amount: number
  count: number
}

export interface LeakageRow {
  campId: string
  clientId: string
  category: LeakageCategoryKey
  reason: string
  amount: number
}
