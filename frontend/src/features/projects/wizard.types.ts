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
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'

// Flat wizard form state across all 7 steps — mirrors crm/wizard.types.ts's
// convention of one flat shape rather than nested per-step sub-objects.
export interface WizardFormState {
  // Step 0 — Lead. leadTenantId/leadDivisionId are used at runtime too, not
  // just for display: they scope Step 5's marketingContact/role pickers.
  leadId: string
  leadTitle: string
  leadTenantId: string
  leadTenantName: string
  leadDivisionId: string
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
  campTimeSlots: CampTimeSlotValue[]
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
  leadDivisionId: '',
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
