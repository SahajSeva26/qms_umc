import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/features/access-management/accessManagement.constants'

// Backend rejects uppercase codes rather than lowercasing them — normalize client-side before submit.
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

// A division may span multiple therapy areas — non-empty, no duplicates.
const THERAPY_VALUES = ['cardiology', 'diabetes', 'pulmonology', 'endocrine', 'orthopedics', 'gynaecology', 'neurology', 'hepatology', 'nephrology', 'ophthalmology', 'dermatology', 'oncology', 'pediatrics', 'wellness'] as const
const therapyListSchema = z
  .array(z.enum(THERAPY_VALUES))
  .min(1, 'Select at least one therapy area.')
  .refine((list) => new Set(list).size === list.length, 'Therapies must be unique.')

export const createDivisionSchema = z.object({
  tenant: z.string().trim().min(1, 'Company is required.'),
  code: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters.')
    .regex(/^\S+$/, 'Code cannot contain spaces.')
    .toLowerCase()
    .refine((val) => !MONGO_OBJECT_ID_REGEX.test(val), {
      message: 'Code must not look like an ObjectId.',
    }),
  name: z.string().trim().min(1, 'Name is required.'),
  therapy: therapyListSchema,
  brandFocus: z.string().optional(),
  mrCount: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
  // Every division has a head — the backend mints a new user for them.
  head: z.object({
    firstName: z.string().trim().min(1, "Head's first name is required"),
    lastName: z.string().trim().optional(),
    email: z.string().trim().min(1, "Head's email is required").email('Enter a valid email'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    phone: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
})

// tenant/code/head/owner are not editable post-create, so they're excluded here.
export const updateDivisionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').optional(),
  therapy: therapyListSchema.optional(),
  brandFocus: z.string().optional(),
  mrCount: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

// Mirrors RegisterUserPayloadSchema (auth.validators.ts) exactly — phone is
// genuinely optional server-side, min(10) only when supplied. Deliberately
// NOT reusing the `head` shape above (which makes phone frontend-optional
// with no length check) — this single-MR form matches the CSV bulk-import
// path's own looser convention instead.
export const singleMrSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional(),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length >= 10, { message: 'Phone number must be at least 10 characters if provided' }),
})

export type SingleMrFormValues = z.infer<typeof singleMrSchema>
