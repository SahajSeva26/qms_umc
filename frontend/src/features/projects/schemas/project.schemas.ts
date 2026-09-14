import { z } from 'zod'
import { CAMP_TIME_SLOT_VALUES } from '@/types/campTimeSlot.constants'
import { MAX_DAYS_TO_BOOK_BEFORE } from '@/features/projects/projects.utils'
import type { WizardFormState } from '@/features/projects/wizard.types'
import {
  PROJECT_THERAPY_LABEL,
  PROJECT_TYPE_LABEL,
  AVAILABLE_POINTER_LABEL,
  type ProjectTherapy,
  type ProjectType,
  type AvailablePointer,
  type WhoCanBookCampCode,
} from '@/types/project.types'
import { ROLE_TYPE_CODE_GROUPS } from '@/features/access-management/role-type/constants/roleTypeCodes'

// Derived from the same source-of-truth *_LABEL records the UI uses — never
// hand-listed, so this can't silently drift from project.types.ts's own enums.
const THERAPY_VALUES = Object.keys(PROJECT_THERAPY_LABEL) as [ProjectTherapy, ...ProjectTherapy[]]
const TYPE_VALUES = Object.keys(PROJECT_TYPE_LABEL) as [ProjectType, ...ProjectType[]]
const POINTER_VALUES = Object.keys(AVAILABLE_POINTER_LABEL) as [AvailablePointer, ...AvailablePointer[]]
// Same "Customer" role-type-code subset WizardStep4.tsx derives whoCanBookCamp options from.
const BOOKING_ROLE_VALUES = (ROLE_TYPE_CODE_GROUPS.find((g) => g.label === 'Customer')?.codes ?? []) as [WhoCanBookCampCode, ...WhoCanBookCampCode[]]

// Never swapped per step — z.object() silently drops undeclared fields, so a
// per-step resolver would make handleSubmit see only the last step's fields.
const wizardFormBaseSchema = z.object({
  // Step 0 — Lead. In edit mode leadId is NOT required — ProjectEntity.lead
  // allows `string | null`, so a stale/deleted reference stays editable.
  leadId: z.string(),
  leadTitle: z.string(),
  leadTenantId: z.string(),
  leadTenantName: z.string(),
  leadDivisionId: z.string(),
  leadDivisionName: z.string(),

  // Step 1 — Basics
  name: z.string(),
  therapy: z.union([z.enum(THERAPY_VALUES), z.literal('')]),
  type: z.array(z.enum(TYPE_VALUES)),
  tests: z.array(z.string()),

  // Step 2 — Execution
  mode: z.enum(['po', 'agreement', 'mail_confirmation']),
  poNumber: z.string(),
  poDate: z.string(),
  poExpiry: z.string(),
  agreementNumber: z.string(),
  agreementStartDate: z.string(),
  agreementEndDate: z.string(),
  duration: z.number().int('Duration must be a whole number of months.').nonnegative('Duration cannot be negative.'),
  agreementDocument: z.string(),
  emailReference: z.string(),
  emailDocument: z.string(),

  // Step 3 — Financials. .nonnegative() mirrors the backend's own already-live
  // rule (project.validators.ts); totalCamps also matches its z.number().int().
  campCost: z.number().nonnegative('Camp cost cannot be negative.'),
  totalCamps: z.number().int('Total camps must be a whole number.').nonnegative('Total camps cannot be negative.'),
  valueBeforeGST: z.number().gt(0, 'Set camp cost × total camps or value before GST.'),
  valueBeforeGSTTouched: z.boolean(),
  gst: z.number().min(0, 'GST must be between 0 and 100%.').max(100, 'GST must be between 0 and 100%.'),
  additionalCost: z.number().nonnegative('Additional cost cannot be negative.'),

  // Step 4 — Operations
  campTimeSlots: z.array(z.enum(CAMP_TIME_SLOT_VALUES)).min(1, 'Add at least one camp time slot.'),
  freeCancelHours: z.number().int('Free-cancel hours must be a whole number.').nonnegative('Free-cancel hours cannot be negative.'),
  cancellationAllowed: z.number().min(0, 'Cancellations allowed must be between 0 and 100%.').max(100, 'Cancellations allowed must be between 0 and 100%.'),
  campCostDeductionOnChargableCancel: z.number().min(0, 'Deduction must be between 0 and 100%.').max(100, 'Deduction must be between 0 and 100%.'),
  goLiveScopeCode: z.enum(['states', 'cities', 'pan']),
  goLiveScopeValues: z.array(z.string()),
  whoCanBookCamp: z.array(z.enum(BOOKING_ROLE_VALUES)).min(1, 'Select at least one booking role.'),

  // Step 5 — Team & Payment
  salesRep: z.string().min(1, 'Select the project sales rep.'),
  projectCoordinator: z.string().min(1, 'Select the project coordinator.'),
  marketingContact: z.string().min(1, 'Select the pharma marketing contact.'),
  paymentTerms: z.enum(['net_30', 'net_60', 'net_90']),

  // Step 6 — Reports & Review
  daysToBookBefore: z.number().int('Days to book before must be a whole number.').nonnegative('Days to book before cannot be negative.').max(MAX_DAYS_TO_BOOK_BEFORE, `Days to book before cannot exceed ${MAX_DAYS_TO_BOOK_BEFORE}.`),
  dietChart: z.array(z.object({ name: z.string(), url: z.string() })),
  poRenewalReminder: z.number().min(0, 'PO renewal reminder must be between 0 and 100%.').max(100, 'PO renewal reminder must be between 0 and 100%.'),
  clientReportCandance: z.enum(['weekly', 'half_monthly', 'monthly', 'quarterly', 'halfyearly', 'yearly']),
  availablePointers: z.array(z.enum(POINTER_VALUES)),
  tats: z.string(),
  sops: z.string(),
})

// Rules shared by both create and edit modes — excludes the lead-required
// check, which only makes sense in create mode.
function applySharedWizardRefinements<T extends typeof wizardFormBaseSchema>(schema: T) {
  return schema
    // Step 1
    .superRefine((v, ctx) => {
      if (!v.name.trim()) ctx.addIssue({ code: 'custom', message: 'Project name is required.', path: ['name'] })
      if (!v.therapy) ctx.addIssue({ code: 'custom', message: 'Select a therapy.', path: ['therapy'] })
      if (v.type.length === 0) ctx.addIssue({ code: 'custom', message: 'Select at least one project type.', path: ['type'] })
    })
    // Step 2 — mode-conditional required fields
    .superRefine((v, ctx) => {
      if (v.mode === 'po' && v.poNumber.trim().length === 0) {
        ctx.addIssue({ code: 'custom', message: 'PO number is required for PO-based projects.', path: ['poNumber'] })
      }
      if (v.mode === 'po' && v.poDate.trim().length === 0) {
        ctx.addIssue({ code: 'custom', message: 'PO date is required for PO-based projects.', path: ['poDate'] })
      }
      if (v.mode === 'agreement' && v.agreementStartDate.trim().length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Agreement start date is required.', path: ['agreementStartDate'] })
      }
      if (v.mode === 'mail_confirmation' && v.emailReference.trim().length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Email reference / subject is required.', path: ['emailReference'] })
      }
    })
    // Step 4 — go-live scope requires at least one value unless PAN-India
    .superRefine((v, ctx) => {
      if (v.goLiveScopeCode !== 'pan' && v.goLiveScopeValues.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Select at least one state or city.', path: ['goLiveScopeValues'] })
      }
    })
}

// Create mode — leadId required (Step 0 is shown and must be answered).
export const createProjectWizardSchema = applySharedWizardRefinements(wizardFormBaseSchema).superRefine((v, ctx) => {
  if (!v.leadId) {
    ctx.addIssue({ code: 'custom', message: 'Select a lead to convert into a project.', path: ['leadId'] })
  }
})

// Edit mode — leadId is never required, so a stale lead reference stays saveable.
export const editProjectWizardSchema = applySharedWizardRefinements(wizardFormBaseSchema)

export type WizardFormValues = z.infer<typeof wizardFormBaseSchema>

// Fields grouped by CREATE-mode step. Edit mode drops Step 0 ("Lead") —
// callers must index via `.slice(1)` in edit mode, never this array directly.
export const CREATE_STEP_FIELD_NAMES: (keyof WizardFormState)[][] = [
  ['leadId'],
  ['name', 'therapy', 'type'],
  ['mode', 'poNumber', 'poDate', 'agreementStartDate', 'duration', 'emailReference'],
  ['campCost', 'totalCamps', 'valueBeforeGST', 'gst', 'additionalCost'],
  ['campTimeSlots', 'freeCancelHours', 'cancellationAllowed', 'campCostDeductionOnChargableCancel', 'goLiveScopeCode', 'goLiveScopeValues', 'whoCanBookCamp'],
  ['salesRep', 'projectCoordinator', 'marketingContact', 'paymentTerms'],
  ['daysToBookBefore', 'poRenewalReminder'],
]

export const moveStageSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to change status.'),
})

// EditProjectModal's schema, mirrors UpdateProjectPayload's field set.
export const editProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  therapy: z.string().min(1, 'Select a therapy.'),
  type: z.array(z.string()).min(1, 'Select at least one project type.'),
  campTimeSlots: z.array(z.enum(CAMP_TIME_SLOT_VALUES)).min(1, 'Add at least one camp time slot.'),
  salesRep: z.string().min(1, 'Select the project sales rep.'),
  projectCoordinator: z.string().min(1, 'Select the project coordinator.'),
  marketingContact: z.string().min(1, 'Select the pharma marketing contact.'),
  paymentTerms: z.enum(['net_30', 'net_60', 'net_90']),
})
