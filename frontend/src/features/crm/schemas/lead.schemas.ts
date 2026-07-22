import { z } from 'zod'

// Validation schemas for the CRM lead flows. Each wizard step schema is run
// with safeParse against the full WizardFormState — unknown keys are ignored
// by z.object, so partial-shape schemas are safe here. Field names/ranges
// are cross-checked against CreateLeadPayload in crm.types.ts.

export const wizardStep1Schema = z.object({
  tenantId: z.string().min(1, 'Select a pharma company.'),
  divisionId: z.string().min(1, 'Select a division.'),
  contactPersonId: z.string().min(1, 'Select a contact person.'),
  focusTherapy: z.array(z.string()).min(1, 'Select at least one focus therapy.'),
  focusTherapyDoctor: z.array(z.string()).min(1, 'Select at least one doctor specialty.'),
})

export const wizardStep2Schema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  problemStatement: z.string().trim().min(1, 'Problem statement is required.'),
  numberOfMRS: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.'),
  currentlyDoing: z.array(z.string()).min(1, 'Select at least one current activity.'),
})

export const wizardStep3Schema = z
  .object({
    projectType: z.enum(['screening', 'diet', 'tele_diet', 'lab', 'mixed'], 'Select a project type.'),
    offers: z
      .array(z.object({ code: z.string(), subOffer: z.string().optional(), reason: z.string().optional() }))
      .min(1, 'Select at least one QMS offering.'),
  })
  .superRefine((v, ctx) => {
    v.offers.forEach((offer, i) => {
      if (!offer.reason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: `Add a reason for "${offer.code}".`,
          path: ['offers', i, 'reason'],
        })
      }
    })
  })

export const wizardStep4Schema = z.object({
  estimatedValue: z.number().nonnegative('Must be 0 or more.'),
  confidence: z.number().int('Must be a whole number.').min(0).max(100),
  followUpDate: z.string().min(1, 'Follow-up date is required.'),
  salesPersonId: z.string().min(1, 'Select a sales rep.'),
})

// Only enforced when the stage move requires a reason (backward moves etc.)
export const stageMoveReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required.'),
})

// Edit Lead modal — mirrors UpdateLeadPayload in crm.types.ts exactly (13
// fields; notably no tenant/division/status — those aren't editable via this
// payload, division/tenant are immutable post-create and status only moves
// through moveStage). Reuses the wizard's own per-field rules (steps 1-4
// combined into one flat schema) since it's editing the same data shape,
// just as a single form instead of a multi-step flow.
export const editLeadSchema = z
  .object({
    contactPersonId: z.string().min(1, 'Select a contact person.'),
    salesPersonId: z.string().min(1, 'Select a sales rep.'),
    title: z.string().trim().min(1, 'Title is required.'),
    problemStatement: z.string().trim().min(1, 'Problem statement is required.'),
    numberOfMRS: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.'),
    projectType: z.enum(['screening', 'diet', 'tele_diet', 'lab', 'mixed'], 'Select a project type.'),
    focusTherapy: z.array(z.string()).min(1, 'Select at least one focus therapy.'),
    focusTherapyDoctor: z.array(z.string()).min(1, 'Select at least one doctor specialty.'),
    currentlyDoing: z.array(z.string()).min(1, 'Select at least one current activity.'),
    offers: z.array(z.object({ code: z.string(), subOffer: z.string().optional(), reason: z.string().optional() })).min(1, 'Select at least one QMS offering.'),
    notes: z.string().optional(),
    estimatedValue: z.number().nonnegative('Must be 0 or more.'),
    confidence: z.number().int('Must be a whole number.').min(0).max(100),
    followUpDate: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    v.offers.forEach((offer, i) => {
      if (!offer.reason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: `Add a reason for "${offer.code}".`,
          path: ['offers', i, 'reason'],
        })
      }
    })
  })
