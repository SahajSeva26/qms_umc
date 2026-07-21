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
}

export interface SearchDivisionQuery {
  // NOTE: this field is genuinely named `tenantId` on Division's search
  // schema, unlike every other search query in this app which uses `tenant`
  // — only honored server-side if caller has `lead:manage` or `tenant:admin`.
  tenantId?: string
  code?: string
  name?: string
  therapy?: DivisionTherapy
  status?: DivisionStatus
  page?: string
  limit?: string
}

export interface CreateDivisionPayload {
  // Backend validates `.lowercase()` as a CHECK, not a transform — an
  // uppercase code is rejected, not normalized. Lowercase client-side first.
  code: string
  name: string
  therapy: DivisionTherapy
  brandFocus?: string
  mrCount?: number
}

export interface UpdateDivisionPayload {
  name?: string
  therapy?: DivisionTherapy
  brandFocus?: string
  mrCount?: number
  status?: DivisionStatus
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

export interface LeadStageHistoryEntry {
  from: LeadStatus
  to: LeadStatus
  reason: string
  // Raw Role ObjectId string — never populated (lead.service.ts's populate
  // array has no entry for stageHistory.createdBy), same on get and search.
  createdBy: string
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

// contactPerson/salesPerson are populated as the ENTIRE Role document (no
// `select` in lead.service.ts's populate array, unlike tenant/division) —
// includes `permissions[]`, and its own `type`/`user`/`tenant` sub-refs stay
// as raw ObjectId strings (Role's own nested populate is never invoked here).
// This is a real backend over-fetch, not a frontend modeling choice — do not
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

export interface LeadEntity {
  id: string
  // Both GET-by-id AND search always populate tenant/division/contactPerson/
  // salesPerson (LeadService.search unconditionally calls .populate(),
  // ignoring the options.populate flag that gates LeadService.get) — so
  // unlike Role/RoleType/Tenant, there is no raw-string case for these on
  // any read path. The `| string` union only matters for what a create/update
  // response's echo might contain before a follow-up GET.
  tenant: LeadPopulatedTenant | string
  division: LeadPopulatedDivision | string
  contactPerson: LeadPopulatedRole | string
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
