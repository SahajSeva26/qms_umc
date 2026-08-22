import type { RegisterOwnerPayload } from '@/features/access-management/accessManagement.types'

// Real backend-integrated types for the CRM/Lead pipeline (Division + Lead).
// Matches backend/src/modules/{division,crm/lead}/* exactly.

// ---------------------------------------------------------------------------
// Division
// ---------------------------------------------------------------------------

export type DivisionTherapy =
  | 'cardiology'
  | 'diabetes'
  | 'pulmonology'
  | 'endocrine'
  | 'orthopedics'
  | 'gynaecology'
  | 'neurology'
  | 'hepatology'
  | 'nephrology'
  | 'ophthalmology'
  | 'dermatology'
  | 'oncology'
  | 'pediatrics'
  | 'wellness'

export const DIVISION_THERAPY_LABEL: Record<DivisionTherapy, string> = {
  cardiology: 'Cardiology',
  diabetes: 'Diabetes',
  pulmonology: 'Pulmonology',
  endocrine: 'Endocrine',
  orthopedics: 'Orthopedics',
  gynaecology: 'Gynaecology',
  neurology: 'Neurology',
  hepatology: 'Hepatology',
  nephrology: 'Nephrology',
  ophthalmology: 'Ophthalmology',
  dermatology: 'Dermatology',
  oncology: 'Oncology',
  pediatrics: 'Pediatrics',
  wellness: 'Wellness',
}

export type DivisionStatus = 'active' | 'inactive'

/** Populated shape for Division.tenant (search always populates). Nested relations carry Mongoose's raw `_id`, not a mapped `id`. */
export interface DivisionPopulatedTenant {
  _id?: string
  name: string
  code: string
}

/** Populated shape for Division.owner (the division's head Role) — `user`/`type` are best-effort, not guaranteed present. */
export interface DivisionPopulatedOwnerRole {
  _id?: string
  user?: {
    firstName: string
    lastName?: string
    email: string
    phone?: string
    gender?: 'male' | 'female' | 'other'
    status: string
  }
  type?: {
    name: string
    code: string
  }
}

export interface DivisionEntity {
  id: string
  code: string
  name: string
  // A division may span multiple therapy areas — never empty.
  therapy: DivisionTherapy[]
  brandFocus: string
  mrCount: number
  tenant: DivisionPopulatedTenant | string
  createdAt: string
  updatedAt: string
  // Key is ABSENT (not null) unless the caller holds `division:manage`/`tenant:admin`.
  status?: DivisionStatus
  // Same gate as `status`. Bare id when unpopulated (e.g. echoed from create).
  owner?: DivisionPopulatedOwnerRole | string
}

export interface SearchDivisionQuery {
  tenant?: string
  code?: string
  name?: string
  // Still a single value (not an array like DivisionEntity.therapy) — Mongo's
  // array-contains match finds any division whose therapy list includes it.
  therapy?: DivisionTherapy
  status?: DivisionStatus
  // Filter by the division's head Role id — division.service.ts applies this
  // unconditionally if present (no extra permission gate, unlike tenantId).
  owner?: string
  page?: string
  limit?: string
}

export interface CreateDivisionPayload {
  // Accepts a tenant code or ObjectId — every caller must say which company.
  tenant: string
  // Backend rejects uppercase codes rather than lowercasing them.
  code: string
  name: string
  // Non-empty array — a division may span multiple therapy areas.
  therapy: DivisionTherapy[]
  brandFocus?: string
  mrCount?: number
  // Every division has a head — the backend mints a new user + Role for them
  // in the same transaction as the division itself.
  head: RegisterOwnerPayload
}

export interface UpdateDivisionPayload {
  name?: string
  // Replaces the therapy list wholesale when supplied.
  therapy?: DivisionTherapy[]
  brandFocus?: string
  mrCount?: number
  status?: DivisionStatus
}

// Batch-level fields for POST /divisions/bulk-mr, sent as multipart form
// fields alongside the CSV `file`. `supervisor` applies to every row in the CSV.
export interface BulkMrPayload {
  division: string
  supervisor: string
  tenant: string
  file: File
}

// One entry in the bulk-import `errors` array — DB-layer failures only.
// Schema-validation failures are counted in `invalidRows` with no per-row
// detail (a real backend gap, not a frontend omission).
export interface BulkMrRowError {
  item?: unknown
  index?: number
  error?: unknown
}

// On the HTTP 400 partial-failure path, counts genuinely aren't known —
// `undefined`, not defaulted to 0, so the UI can say "unknown" not a lie.
export interface BulkMrResult {
  totalRows?: number
  validRows?: number
  invalidRows?: number
  created?: number
  failed: number
  errors: BulkMrRowError[]
}

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'pilot' | 'negotiation' | 'won' | 'lost'

// The only legal `to` values from a given current `status`. `won`/`lost` are
// terminal — there is no reopen path via this API.
export const LEAD_TRANSITION_MAP: Record<LeadStatus, LeadStatus[]> = {
  new: ['qualified'],
  qualified: ['proposal', 'lost'],
  proposal: ['pilot', 'negotiation', 'lost'],
  pilot: ['negotiation', 'won', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  pilot: 'Pilot',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

// Not backend-defined — one consistent swatch per status for the UI.
export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: '#3b6dff',
  qualified: '#0ea5e9',
  proposal: '#f59e0b',
  pilot: '#8b5cf6',
  negotiation: '#ec4899',
  won: '#10b981',
  lost: '#f43f5e',
}

export type LeadProjectType = 'screening' | 'diet' | 'tele_diet' | 'lab' | 'mixed'

export const LEAD_PROJECT_TYPE_LABEL: Record<LeadProjectType, string> = {
  screening: 'Screening',
  diet: 'Diet',
  tele_diet: 'Tele-Diet',
  lab: 'Lab',
  mixed: 'Mixed',
}

export interface LeadOffer {
  code: string
  subOffer?: string
  reason?: string
}

export interface LeadStageHistoryActor {
  roleId?: string
  name?: string
  email?: string
}

export interface LeadStageHistoryEntry {
  from: LeadStatus
  to: LeadStatus
  reason: string
  // Immutable actor snapshot taken at the moment of the transition.
  actor: LeadStageHistoryActor
  createdAt: string
}

/** Populated shape for Lead.tenant/.division (both always populate on GET/search). */
export interface LeadPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface LeadPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: DivisionTherapy[]
}

// salesPerson populates as the ENTIRE Role document (backend over-fetch, not
// a frontend choice) — only read the fields actually needed.
export interface LeadPopulatedRole {
  _id?: string
  code: string
  name: string
  description?: string
  permissions: string[]
  status: string
  type: string
  user: string
  tenant: string
}

// The raw, unmapped Mongoose Contact document (embedded straight through, no
// re-mapping step) — mirrors contact.model.ts's schema, NOT contact.types.ts's
// ContactEntity (ContactMapper's own response shape, used by Contact's endpoints only).
export interface LeadPopulatedContact {
  _id?: string
  tenant: string
  name: string
  designation?: string
  email?: string
  phone?: string
  location?: string
  type: string
  user?: string
  status: string
}

export interface LeadEntity {
  id: string
  // Sequential human-readable code minted via the Counter module (e.g. "ld-000001").
  code: string
  // Both GET-by-id and search always populate these 4 — the `| string` union
  // only matters for a create/update response's echo before a follow-up GET.
  tenant: LeadPopulatedTenant | string
  division: LeadPopulatedDivision | string
  contactPerson: LeadPopulatedContact | string
  salesPerson: LeadPopulatedRole | string
  focusTherapy: string[]
  focusTherapyDoctor: string[]
  title: string
  problemStatement: string
  numberOfMRS: number
  currentlyDoing: string[]
  notes?: string
  projectType: LeadProjectType
  offers: LeadOffer[]
  estimatedValue: number
  followUpDate?: string
  confidence: number
  status: LeadStatus
  stageHistory: LeadStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchLeadQuery {
  title?: string
  status?: LeadStatus
  projectType?: LeadProjectType
  division?: string
  salesPerson?: string
  page?: string
  limit?: string
}

export interface CreateLeadPayload {
  // Backend derives the real tenant/division from the resolved Division and
  // 400s on a mismatch rather than trusting this value outright.
  tenant: string
  division: string
  contactPerson: string
  salesPerson: string
  title: string
  problemStatement: string
  numberOfMRS: number
  projectType?: LeadProjectType
  focusTherapy?: string[]
  focusTherapyDoctor?: string[]
  currentlyDoing?: string[]
  offers?: LeadOffer[]
  notes?: string
  estimatedValue?: number
  // Defaults to 35 server-side (Zod .default(35)) if omitted.
  confidence?: number
  followUpDate?: string
}

// division/tenant/status are not editable here — status only moves via moveStage().
export interface UpdateLeadPayload {
  contactPerson?: string
  salesPerson?: string
  title?: string
  problemStatement?: string
  numberOfMRS?: number
  projectType?: LeadProjectType
  focusTherapy?: string[]
  focusTherapyDoctor?: string[]
  currentlyDoing?: string[]
  offers?: LeadOffer[]
  notes?: string
  estimatedValue?: number
  confidence?: number
  followUpDate?: string
}

export interface MoveLeadStagePayload {
  to: LeadStatus
  reason: string
}

// Generic UI shape for CrmKpiStrip — no backend KPI endpoint; computed
// client-side from the real LeadEntity[] already in cache.
export interface KpiTile {
  id: string
  label: string
  tone: string
  icon: string
  fmt: 'inr' | 'num' | 'pct' | 'raw'
  value: number | string
  delta: number
  sub?: string
}
