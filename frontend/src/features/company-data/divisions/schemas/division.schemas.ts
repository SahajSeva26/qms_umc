import { z } from 'zod'

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
})
