import type {
  AvailablePointer,
  ClientReportCadence,
  DietChartEntry,
  ExecutionModeType,
  GoLiveScopeCode,
  PaymentTerms,
  ProjectTest,
  ProjectTherapy,
  ProjectType,
  WhoCanBookCampCode,
} from '@/types/project.types'

// Flat wizard form state — one object across all 7 steps (Step 0 is new: the
// wizard didn't previously need a lead-selection step since the old mock had
// no Lead concept at all). Mirrors crm/wizard.types.ts's convention: flatten
// all steps' fields onto one state shape rather than nesting per-step
// sub-objects.
export interface WizardFormState {
  // Step 0 — Lead (new). Read-only, lead-derived display values are carried
  // alongside the id purely for showing "creating for {tenant} / {division}"
  // on every later step — never sent in the create payload (tenant/division
  // are derived server-side from `lead`, not accepted in CreateProjectPayload).
  // leadTenantId IS needed at runtime (not just for display): Step 5's
  // marketingContact picker must scope to this exact tenant id, mirroring
  // project.service.ts's set() check that marketingContact.tenant must equal
  // the project's own (lead-derived) tenant.
  leadId: string
  leadTitle: string
  leadTenantId: string
  leadTenantName: string
  leadDivisionName: string

  // Step 1 — Basics
  name: string
  therapy: ProjectTherapy | ''
  type: ProjectType[]
  tests: ProjectTest[]

  // Step 2 — Execution
  mode: ExecutionModeType
  poNumber: string
  poDate: string
  poExpiry: string
  agreementNumber: string
  agreementStartDate: string
  agreementEndDate: string
  duration: number
  agreementDocument: string
  emailReference: string
  emailDocument: string

  // Step 3 — Financials
  campCost: number
  totalCamps: number
  valueBeforeGST: number
  valueBeforeGSTTouched: boolean
  gst: number
  additionalCost: number

  // Step 4 — Operations
  campTimeSlots: { start: string; end: string }[]
  freeCancelHours: number
  cancellationAllowed: number
  campCostDeductionOnChargableCancel: number
  goLiveScopeCode: GoLiveScopeCode
  goLiveScopeValues: string[]
  whoCanBookCamp: WhoCanBookCampCode[]

  // Step 5 — Team & Payment
  salesRep: string
  projectCoordinator: string
  marketingContact: string
  paymentTerms: PaymentTerms

  // Step 6 — Reports & Review
  daysToBookBefore: number
  dietChart: DietChartEntry[]
  poRenewalReminder: number
  clientReportCandance: ClientReportCadence
  availablePointers: AvailablePointer[]
  tats: string
  sops: string
}

export const DEFAULT_WIZARD_FORM: WizardFormState = {
  leadId: '',
  leadTitle: '',
  leadTenantId: '',
  leadTenantName: '',
  leadDivisionName: '',

  name: '',
  therapy: '',
  type: [],
  tests: [],

  mode: 'po',
  poNumber: '',
  poDate: new Date().toISOString().slice(0, 10),
  poExpiry: '',
  agreementNumber: '',
  agreementStartDate: '',
  agreementEndDate: '',
  duration: 12,
  agreementDocument: '',
  emailReference: '',
  emailDocument: '',

  campCost: 0,
  totalCamps: 0,
  valueBeforeGST: 0,
  valueBeforeGSTTouched: false,
  gst: 18,
  additionalCost: 0,

  campTimeSlots: [],
  freeCancelHours: 24,
  cancellationAllowed: 10,
  campCostDeductionOnChargableCancel: 50,
  goLiveScopeCode: 'states',
  goLiveScopeValues: [],
  whoCanBookCamp: [],

  salesRep: '',
  projectCoordinator: '',
  marketingContact: '',
  paymentTerms: 'net_30',

  daysToBookBefore: 0,
  dietChart: [],
  poRenewalReminder: 80,
  clientReportCandance: 'monthly',
  availablePointers: [],
  tats: '24 hours · MOM submission\n48 hours · Slot confirmation\n72 hours · Patient data upload',
  sops: '',
}
