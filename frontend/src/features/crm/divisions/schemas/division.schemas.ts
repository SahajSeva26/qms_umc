import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/features/access-management/accessManagement.constants'

// Mirrors CreateDivisionPayload in crm.types.ts AND backend
// division.validators.ts's CreateDivisionPayloadSchema exactly: min(3), must
// not look like a Mongo ObjectId (matches the same rule + regex already
// established for Tenant's own code field in
// access-management/tenant/schemas/tenant.schemas.ts). `code` is checked
// against the backend's own `.lowercase()` CHECK (not a transform — an
// uppercase code is rejected, not normalized), so we lowercase client-side
// before submit rather than validate-then-reject on casing.
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

export const createDivisionSchema = z.object({
  // Required for every caller since the 2026-07-30 backend change — the
  // platform-tenant block was removed and Division no longer force-pins to
  // the caller's own tenant, so every create must explicitly say which
  // company the division belongs to.
  tenant: z.string().trim().min(1, 'Company is required.'),
  code: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters.')
    .refine((val) => !MONGO_OBJECT_ID_REGEX.test(val), {
      message: 'Code must not look like an ObjectId.',
    }),
  name: z.string().trim().min(1, 'Name is required.'),
  therapy: z.enum(
    ['cardiology', 'diabetes', 'pulmonology', 'endocrine', 'orthopedics', 'gynaecology', 'neurology', 'hepatology', 'nephrology', 'ophthalmology', 'dermatology', 'oncology', 'pediatrics', 'wellness'],
    'Select a therapy area.',
  ),
  brandFocus: z.string().optional(),
  mrCount: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
  // Required — every division has a head (division.service.ts mints a
  // brand-new user + Role for this person in the same transaction as the
  // division). Same inline shape as createTenantSchema's `owner` field in
  // tenant.schemas.ts — no shared/extracted fragment exists yet for this
  // registration-payload shape, so this mirrors that file field-for-field
  // rather than introducing a new abstraction on its own.
  head: z.object({
    firstName: z.string().trim().min(1, "Head's first name is required"),
    lastName: z.string().trim().optional(),
    email: z.string().trim().min(1, "Head's email is required").email('Enter a valid email'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    phone: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
})

// Mirrors UpdateDivisionPayload in crm.types.ts AND backend
// division.validators.ts's UpdateDivisionPayloadSchema exactly: name/therapy/
// brandFocus/mrCount/status only, EVERY field optional there — never
// tenant/code/head/owner, none of which are editable per the backend.
// DivisionDetailPage always sends every field (a full-replace UX, not a
// partial-patch one), so name/therapy/status are still validated as
// non-empty here — this is a stricter client-side UX choice layered on top
// of a schema that otherwise accepts a true partial payload, matching the
// backend's own looser contract.
export const updateDivisionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').optional(),
  therapy: z
    .enum(
      ['cardiology', 'diabetes', 'pulmonology', 'endocrine', 'orthopedics', 'gynaecology', 'neurology', 'hepatology', 'nephrology', 'ophthalmology', 'dermatology', 'oncology', 'pediatrics', 'wellness'],
      'Select a therapy area.',
    )
    .optional(),
  brandFocus: z.string().optional(),
  mrCount: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
