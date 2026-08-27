// A Project is created FROM a Lead (exactly one per Lead — backend 409s otherwise);
// tenant/division are derived server-side from the Lead, not user-picked.

import type { DivisionTherapy, LeadPopulatedContact } from './crm.types'
import type { CampTimeSlotValue } from './campTimeSlot.constants'

// ---------------------------------------------------------------------------
// Enums / constants
// ---------------------------------------------------------------------------

// A strict subset of Division's own therapy enum (DivisionTherapy).
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

// Array-valued field — a project can be more than one type at once.
export type ProjectType = 'screening_camp' | 'diet' | 'teleconsultation_diet' | 'lab_test' | 'mixed'

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  screening_camp: 'Screening Camp',
  diet: 'Diet',
  teleconsultation_diet: 'Teleconsultation Diet',
  lab_test: 'Lab Test',
  mixed: 'Mixed',
}


export type ExecutionModeType = 'po' | 'agreement' | 'mail_confirmation'

export const EXECUTION_MODE_LABEL: Record<ExecutionModeType, string> = {
  po: 'PO Based',
  agreement: 'Agreement Based',
  mail_confirmation: 'Mail Confirmation',
}

// Every project starts at `new` server-side (model default) and only moves
// via PATCH /projects/:id/stage.
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

// The only legal `to` values from a given current `status`. `closed` is terminal.
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

// NOTE: the field using this type is `clientReportCandance` (backend's
// spelling, verbatim — not a typo to "fix").
export type ClientReportCadence = 'weekly' | 'half_monthly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly'

export const CLIENT_REPORT_CADENCE_LABEL: Record<ClientReportCadence, string> = {
  weekly: 'Weekly',
  half_monthly: 'Half-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  halfyearly: 'Half-yearly',
  yearly: 'Yearly',
}

// Currently a single value — kept Record-driven so a future backend addition
// only needs a new type member + label entry here, not a UI rebuild. Still
// requires a frontend code change and deploy, just a localized one.
export type AvailablePointer = 'camp_executed'

export const AVAILABLE_POINTER_LABEL: Record<AvailablePointer, string> = {
  camp_executed: 'Camps executed',
}

export type GoLiveScopeCode = 'states' | 'cities' | 'pan'

export const GO_LIVE_SCOPE_LABEL: Record<GoLiveScopeCode, string> = {
  states: 'Specific states',
  cities: 'Specific cities',
  pan: 'PAN-India',
}

// Must match role-type/constants/roleTypeCodes.ts's customer-side RoleTypeCode
// values exactly — a mismatch here silently submits values the backend's Zod enum rejects.
export type WhoCanBookCampCode = 'pharma-division-head' | 'pharma-asm' | 'pharma-rsm' | 'pharma-mr'

// ---------------------------------------------------------------------------
// Nested value objects (plain shapes, not entities — no `id`)
// ---------------------------------------------------------------------------

// One flat object (the backend models this as one sub-document, not a TS
// discriminated union). Fields besides `mode` are optional, meaningful only
// for their own mode (po / agreement / mail_confirmation).
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
  // No file-upload endpoint exists — plain string URL fields, not a base64 blob.
  agreementDocument?: string
  // mail_confirmation
  emailReference?: string
  emailDocument?: string
}

export interface GoLiveScope {
  code: GoLiveScopeCode
  values: string[]
}

export interface DietChartEntry {
  name: string
  url: string
}

export interface ProjectStageHistoryActor {
  roleId?: string
  name?: string
  email?: string
}

export interface ProjectStageHistoryEntry {
  from: ProjectStatus
  to: ProjectStatus
  reason: string
  // Immutable actor snapshot taken at the moment of the transition.
  actor: ProjectStageHistoryActor
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
  // Mirrors DivisionEntity.therapy (crm.types.ts).
  therapy: DivisionTherapy[]
}

// A deliberately slim shape, not the full LeadEntity.
export interface ProjectPopulatedLead {
  _id?: string
  title: string
  status: string
}

// Reused for salesRep/projectCoordinator (both populate as the full Role
// document; only the fields consumed here are typed). marketingContact is a
// Contact reference instead — see LeadPopulatedContact import.
export interface ProjectPopulatedRole {
  _id?: string
  code: string
  name: string
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

// `| string` only applies to a create/update/moveStage echo (no re-fetch with
// populate before responding); GET-by-id/search always populate.
export interface ProjectEntity {
  id: string
  code: string
  name: string
  // Reference fields can come back null (deleted doc, stale reference)
  // despite being `required` server-side — always null-check before unwrapping.
  tenant: ProjectPopulatedTenant | string | null
  division: ProjectPopulatedDivision | string | null
  therapy: ProjectTherapy
  type: ProjectType[]
  // Test._id references — resolve against GET /tests to display names.
  tests: string[]
  lead: ProjectPopulatedLead | string | null
  mode: ExecutionMode | null
  campCost: number
  totalCamps: number
  gst: number
  valueBeforeGST: number
  additionalCost: number
  campTimeSlots: CampTimeSlotValue[]
  freeCancelHours: number
  cancellationAllowed: number
  campCostDeductionOnChargableCancel: number
  goLiveScope: GoLiveScope | null
  whoCanBookCamp: WhoCanBookCampCode[]
  salesRep: ProjectPopulatedRole | string | null
  projectCoordinator: ProjectPopulatedRole | string | null
  // Contact reference, not Role.
  marketingContact: LeadPopulatedContact | string | null
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
  tenant?: string
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
  tests?: string[]
  mode?: ExecutionMode
  campCost?: number
  totalCamps?: number
  gst?: number
  valueBeforeGST?: number
  additionalCost?: number
  campTimeSlots?: CampTimeSlotValue[]
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
// post-create (status only ever moves through moveStage).
export interface UpdateProjectPayload {
  name?: string
  therapy?: ProjectTherapy
  type?: ProjectType[]
  tests?: string[]
  mode?: ExecutionMode
  campCost?: number
  totalCamps?: number
  gst?: number
  valueBeforeGST?: number
  additionalCost?: number
  campTimeSlots?: CampTimeSlotValue[]
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

// UI-only KPI shape — no backend endpoint; computed client-side from the
// real ProjectEntity[] already in cache.
export interface ProjectKpiTile {
  id: string
  label: string
  value: number | string
  tone: string
}
