import type { RegisterOwnerPayload } from '@/types/accessManagement.types'

// Real backend-integrated types for the CRM/Lead pipeline (Division + Lead),
// replacing the old mock-only model in `lead.types.ts`. Matches
// backend/src/modules/{division,crm/lead}/* exactly — see the research notes
// on each interface below for the specific mapper/service behavior each
// field's shape depends on.
//
// Field-name deltas from the old mock model, for anyone diffing history:
// title (was subject), numberOfMRS (was mrCount), currentlyDoing (was
// currentActivities), offers[{code,subOffer,reason}] (was qmsOffers[] +
// qmsOfferDetails), confidence (was confidencePct), followUpDate (was
// nextFollowUpDate), status (was stage).

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

/** Populated shape for Division.tenant as returned by GET (search always populates, per division.service.ts). */
export interface DivisionPopulatedTenant {
  // Nested populated relations carry Mongoose's raw `_id`, not a mapped `id`
  // (same pattern as RolePopulatedTenant in accessManagement.types.ts).
  _id?: string
  name: string
  code: string
}

/**
 * Populated shape for Division.owner (the division's head Role) as returned
 * by GET when populated — division.service.ts's `get()` populate array
 * nests `user` (select 'firstName lastName email phone gender status') and
 * `type` (select 'name code') under the Role. division.mapper.ts only ever
 * extracts `owner._id`/raw id today (RoleMapper is imported but never
 * actually invoked there) — so a fully populated user/type object is only
 * available when this app's OWN code chooses to populate+shape it that way;
 * treat `user`/`type` as optional/best-effort, not guaranteed present.
 */
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
  therapy: DivisionTherapy
  brandFocus: string
  mrCount: number
  tenant: DivisionPopulatedTenant | string
  createdAt: string
  updatedAt: string
  // Only present when the caller holds `division:manage` or `tenant:admin`
  // (DivisionMapper.toResponse gates this — the key is ABSENT, not null, for
  // a lead:manage-only caller using the division-search cross-grant).
  status?: DivisionStatus
  // Same gate as `status` above. The division's head Role — bare id string
  // when the doc wasn't populated (e.g. echoed back from create), or the
  // shape above when it was (get/search).
  owner?: DivisionPopulatedOwnerRole | string
}

export interface SearchDivisionQuery {
  // NOTE: this field is genuinely named `tenantId` on Division's search
  // schema, unlike every other search query in this app which uses `tenant`
  // — only honored server-side if caller has `lead:manage` or
  // `division:manage` (division.service.ts's real gate — NOT `tenant:admin`,
  // that was a stale claim in this comment, corrected 2026-07-31).
  tenantId?: string
  code?: string
  name?: string
  therapy?: DivisionTherapy
  status?: DivisionStatus
  // Filter by the division's head Role id — division.service.ts applies this
  // unconditionally if present (no extra permission gate, unlike tenantId).
  owner?: string
  page?: string
  limit?: string
}

export interface CreateDivisionPayload {
  // Required as of the 2026-07-30 backend change ("division creation allowed,
  // for platform as well") — division.service.ts's create() now resolves
  // this via TenantService.get() unconditionally for EVERY caller (no
  // force-pinning to the caller's own tenant the way Contact's create does),
  // and the old "platform tenant cannot create divisions" block was removed
  // entirely. Accepts a tenant code or ObjectId.
  tenant: string
  // Backend validates `.lowercase()` as a CHECK, not a transform — an
  // uppercase code is rejected, not normalized. Lowercase client-side first.
  code: string
  name: string
  therapy: DivisionTherapy
  brandFocus?: string
  mrCount?: number
  // Required — every division has a head. The backend mints a brand-new
  // user + Role for this person in the same transaction as the division
  // itself (division.service.ts's create(), same "founding owner" pattern
  // as Tenant.owner/tenant:admin). No "use an existing person" path exists
  // server-side — this always registers someone new. Reuses the same
  // registration-payload shape already established for Tenant's own owner.
  head: RegisterOwnerPayload
}

export interface UpdateDivisionPayload {
  name?: string
  therapy?: DivisionTherapy
  brandFocus?: string
  mrCount?: number
  status?: DivisionStatus
}

// Batch-level fields for POST /divisions/bulk-mr — sent as multipart form
// fields alongside the CSV `file`, per division.validators.ts's
// BulkMrPayloadSchema. `supervisor` is a SINGLE Role id (must be a
// `pharma-asm` role belonging to this division/tenant) applied to every row
// in the CSV — the backend has no per-row supervisor column.
export interface BulkMrPayload {
  division: string
  supervisor: string
  tenant: string
  file: File
}

// One entry in the bulk-import response's `errors` array — DB-layer failures
// only (division.service.ts's bulkCreateMr(), via processInBatches). Schema-
// validation failures are counted in `invalidRows` but their per-row detail
// is NOT included here — a real gap in the backend response, not a frontend
// omission.
export interface BulkMrRowError {
  item?: unknown
  index?: number
  error?: unknown
}

// Success shape (HTTP 200) — every count the backend computed for this run.
// On the HTTP 400 partial-failure path (division.controller.ts drops
// everything except `errors` in that response), the counts genuinely aren't
// known — `undefined` there, not defaulted to 0, so the UI can say "unknown"
// instead of a misleading zero.
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

// The backend's real 7-value status enum with an enforced transition map
// (LEAD_TRANSITION_MAP) — no relation to the old mock model's invented
// 5-value LeadStage ('quotation' doesn't exist here; qualified/proposal/pilot
// have no old-model equivalent).
export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'pilot' | 'negotiation' | 'won' | 'lost'

// Mirrors backend/src/modules/crm/lead/lead.constants.ts's LEAD_TRANSITION_MAP
// exactly — the only legal `to` values from a given current `status`. `won`
// and `lost` are terminal (empty arrays) — there is no reopen path via this API.
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

// Not defined server-side (there's no color concept in the backend model) —
// one consistent swatch per status for the Kanban board / pills / charts.
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
  // Immutable actor snapshot taken at the moment of the transition (backend
  // renamed this from a raw, never-populated `createdBy` Role id to a
  // resolved {roleId, name, email} object — 2026-07-27 merge).
  actor: LeadStageHistoryActor
  createdAt: string
}

/** Populated shape for Lead.tenant/.division as returned by GET/search (both always populate — see LeadEntity's comment). */
export interface LeadPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface LeadPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: DivisionTherapy
}

// salesPerson is populated as the ENTIRE Role document (no `select` in
// lead.service.ts's populate array, unlike tenant/division) — includes
// `permissions[]`, and its own `type`/`user`/`tenant` sub-refs stay as raw
// ObjectId strings (Role's own nested populate is never invoked here). This
// is a real backend over-fetch, not a frontend modeling choice — do not
// widen it further; only read the fields actually needed (name/email/etc).
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

// contactPerson switched from a Role reference to a Contact reference
// 2026-08-03 (lead.model.ts's contactPerson.ref, lead.service.ts's set()) —
// this is the raw, unmapped Mongoose Contact document as populated directly
// by lead.service.ts's populate array (`{ path: 'contactPerson' }`, no
// `select`), NOT ContactMapper's own response shape — lead.mapper.ts embeds
// `lead.contactPerson` straight through with no re-mapping step, so this
// mirrors contact.model.ts's real schema fields exactly, not contact.types.ts's
// ContactEntity (which is ContactMapper's shape, used by Contact's own
// endpoints only).
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
  // Sequential human-readable code minted via the Counter module at create
  // time (e.g. "ld-000001") — added in the 2026-07-27 Appointment merge.
  code: string
  // Both GET-by-id AND search always populate tenant/division/contactPerson/
  // salesPerson (LeadService.search unconditionally calls .populate(),
  // ignoring the options.populate flag that gates LeadService.get) — so
  // unlike Role/RoleType/Tenant, there is no raw-string case for these on
  // any read path. The `| string` union only matters for what a create/update
  // response's echo might contain before a follow-up GET.
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
  // Required client-side per the real Zod schema, but the backend derives
  // the Lead's real tenant/division from the resolved Division document and
  // rejects a mismatch (400 "Division does not belong to the selected
  // company") rather than trusting this value outright — see lead.service.ts.
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

// division/tenant/status are NOT editable via this payload — status only
// moves through moveStage() (UpdateLeadPayloadSchema's own doc comment).
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

// KPI-strip tile shape used by CrmKpiStrip/computeKpis — generic UI shape,
// not itself part of the real Lead model (there is no backend KPI endpoint;
// these are all computed client-side from the real LeadEntity[] the pipeline
// already has in cache).
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
