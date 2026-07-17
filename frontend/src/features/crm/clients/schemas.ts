import { z } from 'zod'

// Validation schemas for the Client Management dialogs (PO / MR / Doctor /
// Book Camp). Number inputs arrive as strings from <Input type="number"> —
// z.coerce handles the conversion.

export const poSchema = z.object({
  poNo: z.string().trim().min(1, 'PO number is required.'),
  confirmationType: z.enum(['PO', 'AGREEMENT', 'MAIL']),
  poDate: z.string().min(1, 'PO date is required.'),
  poExpiry: z.string(),
  campCount: z.coerce.number().min(0, 'Camp count must be 0 or more.'),
  value: z.coerce.number().min(0, 'Value must be 0 or more.'),
  status: z.enum(['ACTIVE', 'COMPLETED']),
})

export const mrSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  designation: z.enum(['Sr MR', 'MR']),
  hq: z.string().trim().min(1, 'HQ is required.'),
  region: z.string(),
  manager: z.string().trim(),
  phone: z.string().trim(),
  email: z.string().trim(),
  screeningCities: z.string(),
  dietCities: z.string(),
  labCities: z.string(),
})

export const doctorSchema = z.object({
  name: z.string().trim().min(1, 'Doctor name is required.'),
  specialty: z.string().trim(),
  city: z.string().trim(),
})

const todayIso = () => new Date().toISOString().slice(0, 10)

export const bookCampSchema = z
  .object({
    projectId: z.string().min(1, 'Select a project.'),
    mrId: z.string().min(1, 'Select an MR.'),
    type: z.enum(['Screening', 'Diet', 'Lab']),
    date: z.string().min(1, 'Camp date is required.'),
    slot: z.string().min(1, 'Select a slot.'),
    city: z.string().trim(),
    patientsExpected: z.coerce.number().min(0, 'Expected patients must be 0 or more.'),
    notes: z.string(),
  })
  .refine((v) => !v.date || v.date > todayIso(), {
    message: 'Camp date must be in the future.',
    path: ['date'],
  })
