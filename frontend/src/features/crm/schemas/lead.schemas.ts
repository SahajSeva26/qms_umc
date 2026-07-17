import { z } from 'zod'

// Validation schemas for the CRM lead flows. Each wizard step schema is run
// with safeParse against the full WizardFormState — unknown keys are ignored
// by z.object, so partial-shape schemas are safe here.

export const wizardStep1Schema = z
  .object({
    pharmaCompanyName: z.string().min(1, 'Select a pharma company.'),
    contact: z.string().trim().min(1, 'Contact person is required.'),
    focusTherapies: z.array(z.string()).min(1, 'Select at least one focus therapy.'),
    focusDoctors: z.array(z.string()).min(1, 'Select at least one doctor specialty.'),
    focusDoctorOther: z.string(),
  })
  .refine((v) => !v.focusDoctors.includes('Other') || v.focusDoctorOther.trim().length > 0, {
    message: 'Specify the other specialty.',
    path: ['focusDoctorOther'],
  })

export const wizardStep2Schema = z
  .object({
    subject: z.string().trim().min(1, 'Subject is required.'),
    problemStatement: z.string().trim().min(1, 'Problem statement is required.'),
    currentActivities: z.array(z.string()).min(1, 'Select at least one current activity.'),
    currentActivityOther: z.string(),
  })
  .refine((v) => !v.currentActivities.includes('Other') || v.currentActivityOther.trim().length > 0, {
    message: 'Specify the other activity.',
    path: ['currentActivityOther'],
  })

export const wizardStep3Schema = z
  .object({
    projectType: z.string().min(1, 'Select a project type.'),
    qmsOffers: z.array(z.string()).min(1, 'Select at least one QMS offering.'),
    qmsOfferDetails: z.record(z.string(), z.object({ sub: z.string(), reason: z.string() })),
  })
  .superRefine((v, ctx) => {
    for (const offer of v.qmsOffers) {
      if (!v.qmsOfferDetails[offer]?.reason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: `Add a reason for "${offer}".`,
          path: ['qmsOfferDetails', offer, 'reason'],
        })
      }
    }
  })

export const wizardStep4Schema = z.object({
  nextFollowUpDate: z.string().min(1, 'Next follow-up date is required.'),
})

export const markLostSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  reason: z.string().trim().min(1, 'Reason is required.'),
})

// Only enforced when the stage move requires a reason (backward moves etc.)
export const stageMoveReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required.'),
})
