// Field-network domain types shared by FO Management (features/fo, manager
// view of the FO roster) and My FO Workspace (the FO's own daily-use screen)
// — both read/write the same qms.fo.* mock stores, mirroring the prototype's
// fo-manager.js / fo-portal.js / fo-camp-run.js split over one shared data
// layer. TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export type ClaimType = 'TA' | 'DA' | 'Misc' | 'Other'
export type ClaimStatus = 'DRAFT' | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID'

export interface ClaimOcrResult {
  vendor: string
  amount: number
  gst: number
  confidence: number
}

export interface FoClaim {
  id: string
  foId: string
  foName: string
  date: string
  type: ClaimType
  amount: number
  gst?: number
  vendor?: string
  notes?: string
  campId?: string
  billUrl?: string
  rule?: string
  ocr?: ClaimOcrResult
  fraudFlag?: boolean
  status: ClaimStatus
  filedOn: string
  decidedOn?: string
}

export type LeaveType = 'Casual' | 'Sick' | 'Earned' | 'Comp-off' | 'Unpaid'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface LeaveRequest {
  id: string
  foId: string
  foName: string
  fromDate: string
  toDate: string
  type: LeaveType
  reason: string
  conflictCampIds: string[]
  status: LeaveStatus
  filedOn: string
  documentUrl?: string
}

export type TrainingCategory = 'SOP' | 'Compliance' | 'Device' | 'Safety' | 'Finance'
export type TrainingStatus = 'VALID' | 'EXPIRED'

export interface TrainingCatalogEntry {
  code: string
  name: string
  category: TrainingCategory
  validityDays: number
  videoUrl?: string
  sopUrl?: string
}

export const TRAINING_CATALOG: TrainingCatalogEntry[] = [
  { code: 'SOP-01', name: 'Camp pre-call SOP', category: 'SOP', validityDays: 365, videoUrl: 'https://example.com/sop-01', sopUrl: 'https://example.com/sop-01.pdf' },
  { code: 'DPDP-01', name: 'India DPDP Act for FOs', category: 'Compliance', validityDays: 365, videoUrl: 'https://example.com/dpdp-01' },
  { code: 'PATIENT', name: 'Patient handling + consent', category: 'Compliance', validityDays: 365, videoUrl: 'https://example.com/patient' },
  { code: 'DEV-BP', name: 'BP machine calibration', category: 'Device', validityDays: 180, videoUrl: 'https://example.com/dev-bp' },
  { code: 'DEV-GLU', name: 'Glucometer handling', category: 'Device', validityDays: 180, videoUrl: 'https://example.com/dev-glu' },
  { code: 'DEV-ECG', name: 'ECG operation', category: 'Device', validityDays: 365, videoUrl: 'https://example.com/dev-ecg' },
  { code: 'SAFETY', name: 'Biohazard + safety', category: 'Safety', validityDays: 365, videoUrl: 'https://example.com/safety' },
  { code: 'FRAUD', name: 'Expense fraud awareness', category: 'Finance', validityDays: 365, videoUrl: 'https://example.com/fraud' },
]

export interface TrainingRecord {
  foId: string
  code: string
  passedOn: string
  expiresOn: string
  score: number
}

export type IncidentCategory = 'sos' | 'machine_failure' | 'consumable_shortage' | 'patient_escalation' | 'gps_fraud' | 'other'
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MED' | 'MEDIUM' | 'LOW'
export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export interface Incident {
  id: string
  category: IncidentCategory
  campId?: string
  deviceId?: string
  title: string
  notes: string
  raisedById: string
  raisedByName: string
  foId: string
  foName: string
  severity: IncidentSeverity
  status: IncidentStatus
  createdAt: string
}

export interface ConsumableLot {
  id: string
  name: string
  brand?: string
  type: string
  lot?: string
  batch?: string
  qty: number
  reorderAt?: number
  expiry?: string
  dailyConsumption?: number
  consumptionPerCamp?: number
  foId: string
}

export interface FoNotification {
  id: string
  kind: string
  priority: 'urgent' | 'high' | 'med' | 'low'
  icon: string
  title: string
  body: string
  at: string
  foId?: string
  readAt?: string
}
