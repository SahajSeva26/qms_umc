// Real backend-integrated types for the Project module, replacing the old
// mock-only model entirely. Matches backend/src/modules/crm/project/* exactly
// (model/constants/validators/mapper) — see the comment on each interface for
// the specific service/mapper behavior its shape depends on.
//
// A Project is created FROM a won Lead (backend enforces exactly one Project
// per Lead — project.service.ts's create() 409s if one already exists for the
// given lead). tenant/division are derived server-side from the source Lead
// and are never sent by the client on create.
//
// Backend quirk, deliberately not "fixed" client-side beyond a soft UX filter:
// project.routes.ts's Swagger summary says "create project (from a WON
// lead)", but project.service.ts's create() never actually checks
// lead.status === 'won' — only that the lead exists and no project already
// exists for it. The lead picker restricts to status=won as a UX-only
// convention; it is not a hard backend rule.

import type { DivisionTherapy } from './crm.types'

// ---------------------------------------------------------------------------
// Enums / constants
// ---------------------------------------------------------------------------

// Same enum values as Division's own therapy field (project.constants.ts's
// PROJECT_THERAPY_TYPES matches division.constants.ts's DIVISION_THERAPY
// exactly, minus ophthalmology/dermatology/oncology/pediatrics — Project's
// enum is a strict subset of Division's).
export type ProjectTherapy =
  | 'cardiology'
  | 'diabetes'
  | 'pulmonology'
  | 'endocrine'
  | 'orthopedics'
  | 'gynaecology'
  | 'neurology'
  | 'hepatology'
  | 'nephrology'

export const PROJECT_THERAPY_LABEL: Record<ProjectTherapy, string> = {
  cardiology: 'Cardiology',
  diabetes: 'Diabetes',
  pulmonology: 'Pulmonology',
  endocrine: 'Endocrine',
  orthopedics: 'Orthopedics',
  gynaecology: 'Gynaecology',
  neurology: 'Neurology',
  hepatology: 'Hepatology',
  nephrology: 'Nephrology',
}

// project.constants.ts's PROJECT_TYPES — an ARRAY-valued field on the real
// model (project.model.ts's `type: [{...enum}]`), unlike the old mock's
// single-select ProjectType. A project can be more than one type at once.
export type ProjectType = 'screening_camp' | 'diet' | 'teleconsultation_diet' | 'lab_test' | 'mixed'

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  screening_camp: 'Screening Camp',
  diet: 'Diet',
  teleconsultation_diet: 'Teleconsultation Diet',
  lab_test: 'Lab Test',
  mixed: 'Mixed',
}

// project.constants.ts's PROJECT_TEST_TYPES — a closed backend enum (not an
// Admin-master-driven dynamic list like the old mock's TESTS).
export type ProjectTest = 'fbs' | 'ppbs' | 'rbs' | 'bp' | 'spo2' | 'ecg' | 'lipid' | 'hba1c' | 'spiro' | 'bca'

export const PROJECT_TEST_LABEL: Record<ProjectTest, string> = {
  fbs: 'FBS',
  ppbs: 'PPBS',
  rbs: 'RBS',
  bp: 'BP',
  spo2: 'SPO2',
  ecg: 'ECG',
  lipid: 'Lipid',
  hba1c: 'HbA1c',
  spiro: 'Spiro',
  bca: 'BCA',
}

export type ExecutionModeType = 'po' | 'agreement' | 'mail_confirmation'

export const EXECUTION_MODE_LABEL: Record<ExecutionModeType, string> = {
  po: 'PO Based',
  agreement: 'Agreement Based',
  mail_confirmation: 'Mail Confirmation',
}

// project.constants.ts's PROJECT_STATUS — 4 values (the old mock had only
// LIVE/HOLD/CLOSED, no `new`). Every project starts at `new` server-side
// (model default) and only moves via PATCH /projects/:id/stage.
export type ProjectStatus = 'new' | 'live' | 'hold' | 'closed'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  new: 'New',
  live: 'Live',
  hold: 'Hold',
  closed: 'Closed',
}

// Not defined server-side — one consistent swatch per status for pills.
export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  new: '#3b6dff',
  live: '#10b981',
  hold: '#f59e0b',
  closed: '#94a3b8',
}

// Mirrors project.constants.ts's PROJECT_TRANSITION_MAP exactly — the only
// legal `to` values from a given current `status`. `closed` is terminal.
export const PROJECT_STAGE_TRANSITION_MAP: Record<ProjectStatus, ProjectStatus[]> = {
  new: ['live', 'hold', 'closed'],
  live: ['hold', 'closed'],
  hold: ['live', 'closed'],
  closed: [],
}

export type PaymentTerms = 'net_30' | 'net_60' | 'net_90'

export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = {
  net_30: 'Net 30',
  net_60: 'Net 60',
  net_90: 'Net 90',
}

// project.constants.ts's CLIENT_REPORT_CANDANCE_TYPES — field name preserves
// the backend's own spelling (clientReportCandance) verbatim, not "fixed."
export type ClientReportCadence = 'weekly' | 'half_monthly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly'

export const CLIENT_REPORT_CADENCE_LABEL: Record<ClientReportCadence, string> = {
  weekly: 'Weekly',
  half_monthly: 'Half-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  halfyearly: 'Half-yearly',
  yearly: 'Yearly',
}

// project.constants.ts's CLIENT_REPORT_POINTERS — currently a single value.
// Kept as a Record-driven map (not a hardcoded reorder widget) so a future
// backend addition doesn't require a UI rebuild.
export type AvailablePointer = 'camp_executed'

export const AVAILABLE_POINTER_LABEL: Record<AvailablePointer, string> = {
  camp_executed: 'Camps executed',
}

// project.constants.ts's PROJECT_GO_LIVE_SCOPE.
export type GoLiveScopeCode = 'states' | 'cities' | 'pan'

export const GO_LIVE_SCOPE_LABEL: Record<GoLiveScopeCode, string> = {
  states: 'Specific states',
  cities: 'Specific cities',
  pan: 'PAN-India',
}

// project.model.ts's whoCanBookCamp enum is ALLOWED_ROLETYPE_CODES.CUSTOMER —
// reuse the exact customer-side RoleTypeCode subset already defined in
// role-type/constants/roleTypeCodes.ts rather than redeclaring a parallel
// literal union (avoids drift if the backend enum ever changes).
export type WhoCanBookCampCode = 'pharma-ho' | 'pharma-ms' | 'pharms-asm' | 'pharma-rsm'

// ---------------------------------------------------------------------------
// Nested value objects (plain shapes, not entities — no `id`)
// ---------------------------------------------------------------------------

// One flat object mirroring project.model.ts's executionModeSchema exactly.
// All fields besides `mode` are optional and only meaningful for their own
// mode (po / agreement / mail_confirmation) — the backend itself models this
// as one sub-document, not a TS discriminated union.
export interface ExecutionMode {
  mode: ExecutionModeType
  // po
  poNumber?: string
  poDate?: string
  poExpiry?: string
  // agreement
  agreementNumber?: string
  agreementStartDate?: string
  agreementEndDate?: string
  duration?: number
  // No real file-upload endpoint confirmed for agreementDocument/emailDocument
  // yet — both are plain string URL fields matching the backend's schema
  // (`type: String`), not a base64 blob. See CreateProjectPayload's comment.
  agreementDocument?: string
  // mail_confirmation
  emailReference?: string
  emailDocument?: string
}

// Free-text HH:MM start/end pairs (project.model.ts's campTimeSlots) —
// replaces the old mock's fixed slot-ID picker entirely.
export interface CampTimeSlot {
  start: string
  end: string
}

export interface GoLiveScope {
  code: GoLiveScopeCode
  values: string[]
}

export interface DietChartEntry {
  name: string
  url: string
}

export interface ProjectStageHistoryEntry {
  from: ProjectStatus
  to: ProjectStatus
  reason: string
  // Raw Role ObjectId string — project.service.ts's populate array has no
  // entry for stageHistory.createdBy (same as Lead's own stageHistory).
  createdBy: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Populated relation shapes
// ---------------------------------------------------------------------------

export interface ProjectPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface ProjectPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: DivisionTherapy
}

// project.service.ts's populate array selects only 'title status' for lead —
// a deliberately slim shape, not the full LeadEntity.
export interface ProjectPopulatedLead {
  _id?: string
  title: string
  status: string
}

// Reused for salesRep/projectCoordinator/marketingContact — all three
// populate as the full Role document (project.service.ts's populate array has
// no `select` for these, same over-fetch pattern as Lead's contactPerson/
// salesPerson). Only the fields actually consumed here are typed.
export interface ProjectPopulatedRole {
  _id?: string
  code: string
  name: string
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

// GET /projects/:id and GET /projects (search) BOTH always populate
// (project.controller.ts's get() always passes {populate:true}; search()'s
// service function calls .populate() unconditionally) — so, like Lead, there
// is effectively no raw-string case on any read path today. The `| string`
// union only matters for typing a create/update/moveStage response's echo,
// since none of those three re-fetch with populate before responding
// (project.service.ts's update()/moveStage() call get(id, ctx) with no
// {populate:true} option — confirmed the same behavior exists on Lead's own
// update(), so this is a repo-wide convention, not a Project-specific gap).
export interface ProjectEntity {
  id: string
  name: string
  tenant: ProjectPopulatedTenant | string
  division: ProjectPopulatedDivision | string
  therapy: ProjectTherapy
  type: ProjectType[]
  tests: ProjectTest[]
  lead: ProjectPopulatedLead | string
  mode: ExecutionMode | null
  campCost: number
  totalCamps: number
  gst: number
  valueBeforeGST: number
  additionalCost: number
  campTimeSlots: CampTimeSlot[]
  freeCancelHours: number
  cancellationAllowed: number
  campCostDeductionOnChargableCancel: number
  goLiveScope: GoLiveScope | null
  whoCanBookCamp: WhoCanBookCampCode[]
  salesRep: ProjectPopulatedRole | string
  projectCoordinator: ProjectPopulatedRole | string
  marketingContact: ProjectPopulatedRole | string
  paymentTerms: PaymentTerms
  status: ProjectStatus
  stageHistory: ProjectStageHistoryEntry[]
  daysToBookBefore: number
  effectiveEarliestSlot?: string
  dietChart: DietChartEntry[]
  poRenewalReminder: number
  clientReportCandance?: ClientReportCadence
  availablePointers: AvailablePointer[]
  tats: string
  sops: string
  createdAt: string
  updatedAt: string
}

export interface SearchProjectQuery {
  name?: string
  status?: ProjectStatus
  therapy?: ProjectTherapy
  division?: string
  lead?: string
  salesRep?: string
  page?: string
  limit?: string
}

// Matches CreateProjectPayloadSchema exactly — tenant/division/status are NOT
// accepted (derived server-side from `lead`).
export interface CreateProjectPayload {
  lead: string
  name: string
  therapy: ProjectTherapy
  type: ProjectType[]
  tests?: ProjectTest[]
  mode?: ExecutionMode
  campCost?: number
  totalCamps?: number
  gst?: number
  valueBeforeGST?: number
  additionalCost?: number
  campTimeSlots?: CampTimeSlot[]
  freeCancelHours?: number
  cancellationAllowed?: number
  campCostDeductionOnChargableCancel?: number
  goLiveScope?: GoLiveScope
  whoCanBookCamp?: WhoCanBookCampCode[]
  salesRep: string
  projectCoordinator: string
  marketingContact: string
  paymentTerms: PaymentTerms
  daysToBookBefore?: number
  effectiveEarliestSlot?: string
  dietChart?: DietChartEntry[]
  poRenewalReminder?: number
  clientReportCandance?: ClientReportCadence
  availablePointers?: AvailablePointer[]
  tats?: string
  sops?: string
}

// Same as create minus `lead` — lead/tenant/division/status are all immutable
// post-create (status only ever moves through moveStage, per
// project.service.ts's update()'s own comment: "lead/tenant/division/status
// are not touched here").
export interface UpdateProjectPayload {
  name?: string
  therapy?: ProjectTherapy
  type?: ProjectType[]
  tests?: ProjectTest[]
  mode?: ExecutionMode
  campCost?: number
  totalCamps?: number
  gst?: number
  valueBeforeGST?: number
  additionalCost?: number
  campTimeSlots?: CampTimeSlot[]
  freeCancelHours?: number
  cancellationAllowed?: number
  campCostDeductionOnChargableCancel?: number
  goLiveScope?: GoLiveScope
  whoCanBookCamp?: WhoCanBookCampCode[]
  salesRep?: string
  projectCoordinator?: string
  marketingContact?: string
  paymentTerms?: PaymentTerms
  daysToBookBefore?: number
  effectiveEarliestSlot?: string
  dietChart?: DietChartEntry[]
  poRenewalReminder?: number
  clientReportCandance?: ClientReportCadence
  availablePointers?: AvailablePointer[]
  tats?: string
  sops?: string
}

export interface MoveProjectStagePayload {
  to: ProjectStatus
  reason: string
}

// UI-only KPI shape for the Projects list header strip — no backend KPI
// endpoint exists; computed client-side from the real ProjectEntity[] already
// in cache, same convention as crm.types.ts's KpiTile.
export interface ProjectKpiTile {
  id: string
  label: string
  value: number | string
  tone: string
}
