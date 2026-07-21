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

// 'inventory_mismatch' added for Incidents · SOS (OM-facing) — the
// consumable/device stock-discrepancy category that screen's Raise Ticket
// flow supports alongside the FO-side RaiseSosModal's original 6.
export type IncidentCategory = 'sos' | 'machine_failure' | 'consumable_shortage' | 'patient_escalation' | 'gps_fraud' | 'inventory_mismatch' | 'other'
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MED' | 'MEDIUM' | 'LOW'
// CANCELLED added as a side-exit from the OPEN/ASSIGNED states (a ticket
// raised in error or made moot) — distinct from CLOSED, which only follows
// RESOLVED in the normal lifecycle.
export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'

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

  // OM-facing Incidents · SOS extensions (additive — FO-side IncidentsModule
  // never sets these; they're populated by the OM Kanban/ticket actions).
  assignedToId?: string
  assignedToName?: string
  assignedAt?: string
  startedAt?: string
  resolvedAt?: string
  resolvedNotes?: string
  closedAt?: string
  closedNotes?: string
  cancelledAt?: string
  cancelledReason?: string
  slaMinutes?: number
  slaBreached?: boolean
  city?: string
  replacementDeviceId?: string
  replacementNotes?: string
  escalatedAt?: string
  history?: { at: string; action: string; by: string; note?: string }[]
}

// Per-category SLA response-time table (minutes) — exact transcription of
// incidents-data.js's CATEGORIES (lines 26-34). CRITICAL/sos tickets get the
// tightest window (10 min); 'other' gets 24h (1440 min).
export const INCIDENT_CATEGORIES: { value: IncidentCategory; label: string; defaultSeverity: IncidentSeverity; slaMinutes: number }[] = [
  { value: 'sos', label: 'SOS — emergency', defaultSeverity: 'CRITICAL', slaMinutes: 10 },
  { value: 'machine_failure', label: 'Machine failure', defaultSeverity: 'HIGH', slaMinutes: 60 },
  { value: 'consumable_shortage', label: 'Consumable shortage', defaultSeverity: 'HIGH', slaMinutes: 60 },
  { value: 'inventory_mismatch', label: 'Inventory mismatch', defaultSeverity: 'MEDIUM', slaMinutes: 240 },
  { value: 'patient_escalation', label: 'Patient escalation', defaultSeverity: 'HIGH', slaMinutes: 30 },
  { value: 'gps_fraud', label: 'GPS spoofing / fraud flag', defaultSeverity: 'HIGH', slaMinutes: 120 },
  { value: 'other', label: 'Other', defaultSeverity: 'LOW', slaMinutes: 1440 },
]

// Exact transcription of incidents-data.js's SEVERITY_COLORS (lines 35-37).
export const SEVERITY_COLORS: Record<IncidentSeverity, { bg: string; color: string }> = {
  CRITICAL: { bg: 'color-mix(in srgb, #b91c1c 14%, transparent)', color: '#b91c1c' },
  HIGH: { bg: 'color-mix(in srgb, #f43f5e 14%, transparent)', color: '#f43f5e' },
  MEDIUM: { bg: 'color-mix(in srgb, #f59e0b 14%, transparent)', color: '#f59e0b' },
  MED: { bg: 'color-mix(in srgb, #f59e0b 14%, transparent)', color: '#f59e0b' },
  LOW: { bg: 'color-mix(in srgb, #64748b 14%, transparent)', color: '#64748b' },
}

// Exact transcription of incidents-data.js's STATUS_COLORS (lines 38-40).
export const STATUS_COLORS: Record<IncidentStatus, { bg: string; color: string }> = {
  OPEN: { bg: 'color-mix(in srgb, #94a3b8 14%, transparent)', color: '#94a3b8' },
  ASSIGNED: { bg: 'color-mix(in srgb, #0ea5e9 14%, transparent)', color: '#0ea5e9' },
  IN_PROGRESS: { bg: 'color-mix(in srgb, #7c5cff 14%, transparent)', color: '#7c5cff' },
  RESOLVED: { bg: 'color-mix(in srgb, #10b981 14%, transparent)', color: '#10b981' },
  CLOSED: { bg: 'color-mix(in srgb, #14b8a6 14%, transparent)', color: '#14b8a6' },
  CANCELLED: { bg: 'color-mix(in srgb, #f59e0b 14%, transparent)', color: '#f59e0b' },
}

// Machine fault-flagging — externalized from DeviceCatalogItem.faulty (a
// display-only fallback), the real source of truth per the Incidents
// research spec, keyed by deviceId. Mirrors incidents-data.js's approach.
export interface MachineFlag {
  deviceId: string
  faulty: boolean
  flaggedAt: string
  flaggedByIncidentId?: string
  clearedAt?: string
  clearedBy?: string
  notes?: string
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
