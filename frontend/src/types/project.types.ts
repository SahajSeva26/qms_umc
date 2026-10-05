// A Project is created FROM a Lead (exactly one per Lead — backend 409s otherwise);
// tenant/division are derived server-side from the Lead, not user-picked.

import type { DivisionTherapy, LeadPopulatedContact } from './crm.types'
import type { CampTimeSlotValue } from './campTimeSlot.constants'
import type { CampType } from './campReal.types'

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

// Array-valued field — a project can be more than one type at once (that's how "mixed" is
// expressed; the backend dropped a separate `mixed` value since `type` is already an array).
export type ProjectType = 'screening' | 'diet' | 'lab' | 'teleconsultation_diet'

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  screening: 'Screening Camp',
  diet: 'Diet',
  lab: 'Lab Test',
  teleconsultation_diet: 'Teleconsultation Diet',
}

// `teleconsultation_diet` maps to an EMPTY array deliberately, not `['diet']` — the backend does a
// literal string match against `project.type`, and `teleconsultation_diet` !== `diet`, so a project
// whose ONLY offering is teleconsultation_diet hosts no physical camp of any type.
export const PROJECT_TYPE_CAMP_TYPES: Record<ProjectType, CampType[]> = {
  screening: ['screening'],
  diet: ['diet'],
  lab: ['lab'],
  teleconsultation_diet: [],
}

export function allowedCampTypesForProjectTypes(types: ProjectType[] | undefined | null): CampType[] {
  return [...new Set((types ?? []).flatMap((t) => PROJECT_TYPE_CAMP_TYPES[t]))]
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

// Currently a single value — kept Record-driven so a future backend addition only needs a
// new type member + label entry, not a UI rebuild.
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

// `file` is a File module ObjectId ref — NOT wired on the frontend yet (the backend's file module
// has no ENTITY_RELATION entry for 'project' sub-documents); left as a plain optional id string.
export interface PurchaseOrder {
  number?: string
  date?: string
  expiry?: string
  file?: string
}

// `po` supports MULTIPLE purchase orders; `agreement`/`mail` are still single sub-objects.
export interface ExecutionMode {
  mode: ExecutionModeType
  po?: {
    purchaseOrders?: PurchaseOrder[]
  }
  agreement?: {
    number?: string
    startDate?: string
    endDate?: string
    duration?: number
    // Not wired — see PurchaseOrder.file's note.
    file?: string
  }
  mail?: {
    reference?: string
    // Not wired — see PurchaseOrder.file's note.
    file?: string
  }
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
  // Test._id references — resolve against GET /test-masters to display names.
  tests: string[]
  lead: ProjectPopulatedLead | string | null
  executionMode: ExecutionMode | null
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
  // Only present when the search was called with report=true — per-project rollup for
  // this result page only (see SearchProjectQuery.report).
  stats?: ProjectStats
}

export interface ProjectStats {
  // Camps in `closed` + `cancelled_charged` — the "done" count against `totalCamps`'s quota.
  executedCamps: number
}

export interface ProjectTypeBreakdownEntry {
  type: ProjectType
  count: number
}

// Only present when the search was called with report=true — a breakdown over the whole
// scoped/filtered result set (not just the current page). A multi-type project is counted
// once per type it carries.
export interface ProjectSearchReport {
  total: number
  byType: ProjectTypeBreakdownEntry[]
}

export interface SearchProjectQuery {
  name?: string
  code?: string
  status?: ProjectStatus
  therapy?: ProjectTherapy
  tenant?: string
  division?: string
  lead?: string
  salesRep?: string
  page?: string
  limit?: string
  // When 'true', each item gets a `stats` object and the response gets a top-level `report`
  // (ProjectSearchReport). Unlike tenant's report mode, the backend does NOT cap `limit` here.
  report?: 'true' | 'false'
}

// Matches CreateProjectPayloadSchema exactly — tenant/division/status are NOT
// accepted (derived server-side from `lead`).
export interface CreateProjectPayload {
  lead: string
  name: string
  therapy: ProjectTherapy
  type: ProjectType[]
  tests?: string[]
  executionMode?: ExecutionMode
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
  executionMode?: ExecutionMode
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

// GET /projects/report — no filters accepted server-side (empty query schema),
// always a tenant-wide aggregate. requires project:manage or tenant:manage.
export type ProjectReportQuery = Record<string, never>

export interface ProjectReportStatusEntry {
  status: ProjectStatus
  count: number
  revenue: number
}

export interface ProjectReportTherapyEntry {
  therapy: ProjectTherapy
  count: number
  revenue: number
}

export interface ProjectReportResponse {
  summary: { totalProjects: number }
  byStatus: ProjectReportStatusEntry[]
  byTherapy: ProjectReportTherapyEntry[]
}
