import { z } from 'zod'
import type { DietitianBankAccount } from '@/features/diet/dietitians.types'

// Validation + payload construction for dietitian enrolment.
//
// Two screens enrol a dietitian with the identical field set and the identical
// addDietitianEnrollment() call: the Diet Coord Workspace's bank tab
// (approvals/AddDietitianModal) and the Dietitian Profiles picker
// (profile/AddDietitianModal). Their section headings and button labels
// differ, so the two components stay separate — but the rules and the payload
// shape live here once.
//
// Rules match what the two forms already enforced, plus the gaps they left
// open: an invalid email or a non-numeric rate previously reached the service
// (the rate was silently coerced to 3000).

/** The raw string-shaped form state both modals hold. */
export interface AddDietitianFormInput {
  name: string
  specialty: string
  phone: string
  email: string
  hq: string
  states: string
  ratePerCamp: string
  pan: string
  address: string
  bankName: string
  accountHolder: string
  accountNumber: string
  ifsc: string
  upi: string
  resumeUrl: string
  devices: Set<string> | string[]
}

export const addDietitianSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required'),
  specialty: z.string().trim(),
  // Optional contact fields — validated only when the user typed something,
  // matching the forms' own "optional" labelling.
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address'),
  hq: z.string().trim(),
  states: z.string(),
  // Blank means "use the 3000 default" (what the service itself falls back to).
  // Garbage like "abc" is rejected instead of silently becoming 3000.
  ratePerCamp: z
    .string()
    .trim()
    .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'Rate per camp must be a positive number'),
  pan: z.string().trim(),
  address: z.string().trim(),
  bankName: z.string().trim(),
  accountHolder: z.string().trim(),
  accountNumber: z.string().trim(),
  ifsc: z.string().trim(),
  upi: z.string().trim(),
  resumeUrl: z.string().trim(),
})

export type AddDietitianFormValues = z.infer<typeof addDietitianSchema>

/**
 * Validation only — no payload construction.
 *
 * The two enrolment screens build genuinely DIFFERENT payloads from the same
 * fields (approvals labels the bank account "Primary", falls back to the
 * dietitian's name for the account holder, upper-cases the IFSC and defaults
 * a blank rate to 0; profile labels it "Account 1", leaves the holder
 * undefined and defaults a blank rate to 3000). Those differences change what
 * is persisted, so they are deliberately NOT unified — each screen keeps its
 * own builder and shares only the rules below.
 *
 * `nameMessage` lets each screen keep its existing wording for the one
 * required field.
 */
export function validateDietitianEnrollmentFields(
  input: AddDietitianFormInput,
  nameMessage?: string,
): { ok: true; values: AddDietitianFormValues } | { ok: false; error: string } {
  const parsed = addDietitianSchema.safeParse(input)
  if (parsed.success) return { ok: true, values: parsed.data }
  const issue = parsed.error.issues[0]
  const message = issue?.path?.[0] === 'name' && nameMessage
    ? nameMessage
    : (issue?.message ?? 'Please check the form')
  return { ok: false, error: message }
}

/** The argument shape addDietitianEnrollment() expects. */
export interface DietitianEnrollmentPayload {
  name: string
  specialty: string
  phone: string
  email: string
  hq: string
  states: string[]
  ratePerCamp: number
  pan: string
  address: string
  resumeUrl: string
  deviceAlignment: string[]
  bankAccounts?: DietitianBankAccount[]
}

const DEFAULT_SPECIALTY = 'Clinical nutrition'
const DEFAULT_RATE_PER_CAMP = 3000

/**
 * Validates the form and, on success, builds the enrolment payload — the
 * comma-split states list, the numeric rate, and the optional single bank
 * account both forms construct the same way.
 */
export function parseDietitianEnrollment(
  input: AddDietitianFormInput,
): { ok: true; payload: DietitianEnrollmentPayload } | { ok: false; error: string } {
  const parsed = addDietitianSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form' }
  }
  const v = parsed.data
  const devices = Array.from(input.devices)

  const bankAccounts: DietitianBankAccount[] | undefined = (v.accountNumber || v.upi)
    ? [{
        label: 'Account 1',
        accountName: v.accountHolder || undefined,
        accountNumber: v.accountNumber || undefined,
        ifsc: v.ifsc || undefined,
        branch: v.bankName || undefined,
        upi: v.upi || undefined,
      } as DietitianBankAccount]
    : undefined

  return {
    ok: true,
    payload: {
      name: v.name,
      specialty: v.specialty || DEFAULT_SPECIALTY,
      phone: v.phone,
      email: v.email,
      hq: v.hq,
      states: v.states.split(',').map((s) => s.trim()).filter(Boolean),
      ratePerCamp: v.ratePerCamp === '' ? DEFAULT_RATE_PER_CAMP : Number(v.ratePerCamp),
      pan: v.pan,
      address: v.address,
      resumeUrl: v.resumeUrl,
      deviceAlignment: devices,
      ...(bankAccounts ? { bankAccounts } : {}),
    },
  }
}
