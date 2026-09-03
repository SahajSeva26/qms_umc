import { z } from 'zod'
import { CAMP_TIME_SLOT_VALUES } from '@/types/campTimeSlot.constants'
import { MAX_DAYS_TO_BOOK_BEFORE } from '@/features/projects/projects.utils'

// Each wizard step schema runs with safeParse against the full WizardFormState —
// unknown keys are ignored by z.object, so partial-shape schemas are safe here.

// Step 0 (new) — pick the won Lead this Project is created from. Doesn't
// exist on the old mock wizard; POST /projects requires an existing `lead`.
export const wizardStep0Schema = z.object({
  leadId: z.string().min(1, 'Select a lead to convert into a project.'),
})

export const wizardStep1Schema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  therapy: z.string().min(1, 'Select a therapy.'),
  type: z.array(z.string()).min(1, 'Select at least one project type.'),
})

export const wizardStep2Schema = z
  .object({
    mode: z.enum(['po', 'agreement', 'mail_confirmation']),
    poNumber: z.string(),
    agreementStartDate: z.string(),
    duration: z.number().int('Duration must be a whole number of months.').nonnegative('Duration cannot be negative.'),
    emailReference: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'po' && v.poNumber.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'PO number is required for PO-based projects.', path: ['poNumber'] })
    }
    if (v.mode === 'agreement' && v.agreementStartDate.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Agreement start date is required.', path: ['agreementStartDate'] })
    }
    if (v.mode === 'mail_confirmation' && v.emailReference.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Email reference / subject is required.', path: ['emailReference'] })
    }
  })

export const wizardStep3Schema = z.object({
  valueBeforeGST: z.number().gt(0, 'Set camp cost × total camps or value before GST.'),
  gst: z.number().min(0, 'GST must be between 0 and 100%.').max(100, 'GST must be between 0 and 100%.'),
})

export const wizardStep4Schema = z
  .object({
    campTimeSlots: z.array(z.enum(CAMP_TIME_SLOT_VALUES)).min(1, 'Add at least one camp time slot.'),
    freeCancelHours: z.number().int('Free-cancel hours must be a whole number.').nonnegative('Free-cancel hours cannot be negative.'),
    cancellationAllowed: z.number().min(0, 'Cancellations allowed must be between 0 and 100%.').max(100, 'Cancellations allowed must be between 0 and 100%.'),
    campCostDeductionOnChargableCancel: z.number().min(0, 'Deduction must be between 0 and 100%.').max(100, 'Deduction must be between 0 and 100%.'),
    goLiveScopeCode: z.enum(['states', 'cities', 'pan']),
    goLiveScopeValues: z.array(z.string()),
    whoCanBookCamp: z.array(z.string()).min(1, 'Select at least one booking role.'),
  })
  .refine((v) => v.goLiveScopeCode === 'pan' || v.goLiveScopeValues.length > 0, {
    message: 'Select at least one state or city.',
    path: ['goLiveScopeValues'],
  })

export const wizardStep5Schema = z.object({
  salesRep: z.string().min(1, 'Select the project sales rep.'),
  projectCoordinator: z.string().min(1, 'Select the project coordinator.'),
  marketingContact: z.string().min(1, 'Select the pharma marketing contact.'),
  paymentTerms: z.enum(['net_30', 'net_60', 'net_90']),
})

export const wizardStep6Schema = z.object({
  daysToBookBefore: z.number().int('Days to book before must be a whole number.').nonnegative('Days to book before cannot be negative.').max(MAX_DAYS_TO_BOOK_BEFORE, `Days to book before cannot exceed ${MAX_DAYS_TO_BOOK_BEFORE}.`),
  poRenewalReminder: z.number().min(0, 'PO renewal reminder must be between 0 and 100%.').max(100, 'PO renewal reminder must be between 0 and 100%.'),
})

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
