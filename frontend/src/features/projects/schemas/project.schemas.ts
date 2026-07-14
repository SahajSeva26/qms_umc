import { z } from 'zod'

// Validation schemas for the Project wizard flows. Each wizard step schema is
// run with safeParse against the full WizardFormState — unknown keys are
// ignored by z.object, so partial-shape schemas are safe here.

export const wizardStep1Schema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  clientId: z.string().min(1, 'Select a pharma client.'),
  type: z.string().min(1, 'Select a type of project.'),
})

export const wizardStep2Schema = z
  .object({
    executionMode: z.enum(['PO', 'AGREEMENT', 'MAIL']),
    poNo: z.string(),
    agreementStart: z.string(),
    mailRef: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.executionMode === 'PO' && v.poNo.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'PO number is required for PO-based projects.', path: ['poNo'] })
    }
    if (v.executionMode === 'AGREEMENT' && v.agreementStart.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Agreement start date is required.', path: ['agreementStart'] })
    }
    if (v.executionMode === 'MAIL' && v.mailRef.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Email reference / subject is required.', path: ['mailRef'] })
    }
  })

export const wizardStep3Schema = z.object({
  valueBeforeGst: z.number().gt(0, 'Set camp cost × total camps or value before GST.'),
})

export const wizardStep4Schema = z
  .object({
    campTimeSlots: z.array(z.string()).min(1, 'Select at least one camp time slot.'),
    goLiveScope: z.enum(['STATE', 'CITY', 'PAN_INDIA']),
    goLiveDetails: z.array(z.string()),
    bookingHierarchy: z.array(z.string()).min(1, 'Select at least one booking role.'),
  })
  .refine((v) => v.goLiveScope === 'PAN_INDIA' || v.goLiveDetails.length > 0, {
    message: 'Select at least one state or city.',
    path: ['goLiveDetails'],
  })

export const wizardStep5Schema = z.object({
  salesPersonId: z.string().min(1, 'Select the project sales person.'),
})

export const wizardStep6Schema = z.object({
  status: z.enum(['LIVE', 'HOLD', 'CLOSED']),
})

export const closeProjectSchema = z.object({
  reason: z.string().trim().min(1, 'Close reason is required.'),
})

export const statusChangeSchema = z.object({
  status: z.enum(['LIVE', 'HOLD', 'CLOSED']),
  reason: z.string().trim().min(1, 'A reason is required to change status.'),
})

export const voidCampSchema = z.object({
  date: z.string().trim().min(1, 'Camp date is required.'),
  doctorName: z.string().trim().min(1, 'Doctor name is required.'),
  mailUrl: z.string().trim().min(1, 'Pharma confirmation mail URL is required.'),
  approvedBy: z.string().trim().min(1, 'Approver name is required.'),
})

export const renewProjectSchema = z.object({
  id: z.string().trim().min(1, 'New project ID is required.'),
  name: z.string().trim().min(1, 'New project name is required.'),
  poDate: z.string().trim().min(1, 'New PO date is required.'),
})
