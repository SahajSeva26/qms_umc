import type {
  BookingRole,
  CancellationPolicy,
  DietChartLink,
  ExecutionMode,
  GoLiveScope,
  MixedSubType,
  ProjectStatus,
  ProjectType,
  ReportCadence,
  UploadedDoc,
} from '@/types/project.types'

// Flat wizard form state — one object across all 6 steps, mirroring the
// prototype's single `wz.form` object. Mirrors crm/wizard.types.ts's
// convention: flatten all steps' fields onto one state shape rather than
// nesting per-step sub-objects.
export interface WizardFormState {
  // Step 1 — Basics
  name: string
  clientId: string
  divisionId: string
  therapy: string
  type: ProjectType | ''
  mixedSubTypes: MixedSubType[]
  testsConducted: string[]

  // Step 2 — Execution
  executionMode: ExecutionMode
  poNo: string
  poDate: string
  poExpiry: string
  agreementNo: string
  agreementStart: string
  agreementExpiry: string
  agreementDurationMonths: number
  agreementDoc: UploadedDoc | null
  mailRef: string
  mailAttachmentDoc: UploadedDoc | null

  // Step 3 — Financials
  campCost: number
  totalCamps: number
  valueBeforeGst: number
  valueBeforeGstTouched: boolean
  gstPct: number
  additionalPatientCost: number

  // Step 4 — Operations
  campTimeSlots: string[]
  cancellationPolicy: CancellationPolicy
  goLiveScope: GoLiveScope
  goLiveDetails: string[]
  bookingHierarchy: BookingRole[]

  // Step 5 — Team & Payment
  salesPersonId: string
  coordinatorId: string
  marketingContactId: string
  paymentTerms: string

  // Step 6 — Reports & Review
  status: ProjectStatus
  bookingLeadDays: number
  dietCharts: DietChartLink[]
  renewalReminderPct: number
  reportCadence: ReportCadence
  reportFormat: string[]
  tats: string
  sops: string
}

export const DEFAULT_WIZARD_FORM: WizardFormState = {
  name: '',
  clientId: '',
  divisionId: '',
  therapy: '',
  type: '',
  mixedSubTypes: [],
  testsConducted: [],

  executionMode: 'PO',
  poNo: '',
  poDate: new Date().toISOString().slice(0, 10),
  poExpiry: '',
  agreementNo: '',
  agreementStart: '',
  agreementExpiry: '',
  agreementDurationMonths: 12,
  agreementDoc: null,
  mailRef: '',
  mailAttachmentDoc: null,

  campCost: 0,
  totalCamps: 0,
  valueBeforeGst: 0,
  valueBeforeGstTouched: false,
  gstPct: 18,
  additionalPatientCost: 0,

  campTimeSlots: [],
  cancellationPolicy: { freeHoursPrior: 24, pctAllowed: 10, pctDeducted: 50 },
  goLiveScope: 'STATE',
  goLiveDetails: [],
  bookingHierarchy: ['MR', 'ASM', 'RM', 'HO'],

  salesPersonId: '',
  coordinatorId: '',
  marketingContactId: '',
  paymentTerms: 'Net 30',

  status: 'LIVE',
  bookingLeadDays: 0,
  dietCharts: [],
  renewalReminderPct: 80,
  reportCadence: 'MONTHLY',
  reportFormat: ['Camps executed', 'Patients screened', 'Conversion %', 'Cancellation count'],
  tats: '24 hours · MOM submission\n48 hours · Slot confirmation\n72 hours · Patient data upload',
  sops: '',
}
