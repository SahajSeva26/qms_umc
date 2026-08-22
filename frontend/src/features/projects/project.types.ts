// Real backend-integrated types for the Project module.
//
// A Project is created FROM a Lead (exactly one per Lead — backend 409s
// otherwise); tenant/division are derived server-side from the Lead. The
// lead picker's status=won restriction is a UX-only convention — create()
// itself never checks lead.status.

import type { DivisionTherapy, LeadPopulatedContact } from '@/features/crm/crm.types'

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

// Array-valued field — a project can be more than one type at once.
export type ProjectType = 'screening_camp' | 'diet' | 'teleconsultation_diet' | 'lab_test' | 'mixed'

// A closed backend enum, not an Admin-master-driven dynamic list.
export type ProjectTest = 'fbs' | 'ppbs' | 'rbs' | 'bp' | 'spo2' | 'ecg' | 'lipid' | 'hba1c' | 'spiro' | 'bca'

export type ExecutionModeType = 'po' | 'agreement' | 'mail_confirmation'

// project.constants.ts's PROJECT_STATUS — 4 values (the old mock had only
// LIVE/HOLD/CLOSED, no `new`). Every project starts at `new` server-side
// (model default) and only moves via PATCH /projects/:id/stage.
export type ProjectStatus = 'new' | 'live' | 'hold' | 'closed'

export type PaymentTerms = 'net_30' | 'net_60' | 'net_90'

// NOTE: the field using this type is `clientReportCandance` (backend's
// spelling, verbatim — not a typo to "fix").
export type ClientReportCadence = 'weekly' | 'half_monthly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly'

// Currently a single value — kept Record-driven so a future backend addition
// doesn't require a UI rebuild.
export type AvailablePointer = 'camp_executed'

export type GoLiveScopeCode = 'states' | 'cities' | 'pan'

// Must match role-type/constants/roleTypeCodes.ts's customer-side RoleTypeCode
// values exactly — a previous typo here ('pharma-ms', 'pharms-asm') silently
// submitted values the backend's Zod enum rejects.
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

// Free-text HH:MM start/end pairs.
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
  tests: ProjectTest[]
  lead: ProjectPopulatedLead | string | null
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
// post-create (status only ever moves through moveStage).
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

// UI-only KPI shape — no backend endpoint; computed client-side from the
// real ProjectEntity[] already in cache.
export interface ProjectKpiTile {
  id: string
  label: string
  value: number | string
  tone: string
}
