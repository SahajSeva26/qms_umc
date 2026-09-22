import { z } from 'zod'

// register(name, { valueAsNumber: true }) on an untouched/cleared input yields NaN, not undefined —
// Zod's z.number() rejects NaN even when optional, so this normalizes it back first.
const optionalNumber = () => z.preprocess((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v), z.number().min(0).optional())

// Mirrors employee.validators.ts's LocationSchema — coordinates is NOT optional there, so a
// manually-typed address with no map pin must fail here too, not pass the UI and 400 on submit.
const employeeLocationSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address is required.'),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  country: z.string().trim().min(1).optional(),
  pincode: z.string().trim().min(1, 'Pincode is required.'),
  googlePlaceId: z.string().optional(),
  coordinates: z.tuple([
    z.number('Pick a location on the map to set its coordinates.').min(-180).max(180),
    z.number('Pick a location on the map to set its coordinates.').min(-90).max(90),
  ], 'Pick a location on the map to set its coordinates.'),
})

// Mirrors employee.validators.ts's AadharSchema/PanSchema exactly.
const aadharSchema = z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional().or(z.literal(''))
const panSchema = z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, 'Invalid PAN').optional().or(z.literal(''))

// Mirrors employee.validators.ts's BankDetailsSchema (all fields optional there too).
const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Invalid IFSC code').optional().or(z.literal('')),
  bankName: z.string().trim().optional(),
  branch: z.string().trim().optional(),
})

const employeeProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  profilePicture: z.object({
    url: z.string().optional(),
    thumbnail: z.string().optional(),
  }).optional(),
  dob: z.string().optional(),
  fatherName: z.string().trim().optional(),
  bloodGroup: z.string().trim().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

// Shared by both create-wizard modes and EditEmployeeEditor — deliberately excludes
// user/email/tenant/type, which each caller supplies separately; `phone` is included since it's backend-editable on update.
export const employeeFieldsSchema = z.object({
  phone: z.string().trim().optional(),
  doj: z.string().min(1, 'Date of joining is required.'),
  dol: z.string().optional(),
  reason: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'terminated']).optional(),
  salary: optionalNumber(),
  daRule: z.object({
    type: z.enum(['fixed', 'percentage']),
    value: optionalNumber(),
  }).refine((v) => v.value !== undefined, { message: 'A value is required for the dearness allowance.', path: ['value'] }).optional(),
  aadharNumber: aadharSchema,
  panNumber: panSchema,
  bankDetails: bankDetailsSchema.optional(),
  location: employeeLocationSchema.optional(),
  profile: employeeProfileSchema.optional(),
})

export type EmployeeFieldsValues = z.infer<typeof employeeFieldsSchema>
