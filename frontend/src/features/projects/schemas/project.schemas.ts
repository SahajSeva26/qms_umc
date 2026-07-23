import { z } from 'zod'

// Validation schemas for the Project wizard flows. Each wizard step schema is
// run with safeParse against the full WizardFormState — unknown keys are
// ignored by z.object, so partial-shape schemas are safe here.

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
})

export const wizardStep4Schema = z
  .object({
    campTimeSlots: z.array(z.object({ start: z.string(), end: z.string() })).min(1, 'Add at least one camp time slot.'),
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
  daysToBookBefore: z.number().int().nonnegative(),
})

export const moveStageSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to change status.'),
})

// EditProjectModal's schema, mirrors UpdateProjectPayload's field set.
export const editProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  therapy: z.string().min(1, 'Select a therapy.'),
  type: z.array(z.string()).min(1, 'Select at least one project type.'),
  salesRep: z.string().min(1, 'Select the project sales rep.'),
  projectCoordinator: z.string().min(1, 'Select the project coordinator.'),
  marketingContact: z.string().min(1, 'Select the pharma marketing contact.'),
  paymentTerms: z.enum(['net_30', 'net_60', 'net_90']),
})
