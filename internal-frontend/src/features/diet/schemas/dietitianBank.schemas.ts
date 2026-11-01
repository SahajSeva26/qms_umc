import { z } from 'zod'
import type { DietitianBankAccount } from '@/features/diet/dietitians.types'

// Single source of validation truth for dietitian bank accounts.
//
// The same four rules were previously hand-written in three places
// (approvals/DietitianBankModal, payment/BankEditModal, profile/BankAddDialog)
// with three copies of the account-number and IFSC regexes. The regexes now
// live here once.
//
// The two multi-account modals and the single-account dialog word two of
// their messages differently on screen, so they get two schemas composed from
// the same rules rather than one schema with forced-common wording — message
// text is reproduced verbatim so nothing the user sees changes.
//
// Both schemas also normalise (strip whitespace from the account number,
// upper-case the IFSC) because every call site did that while validating and
// then persisted the normalised values. Parsed output is what should be saved.

const ACCOUNT_NUMBER_RE = /^\d{6,18}$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

const accountNumberField = z
  .string()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => ACCOUNT_NUMBER_RE.test(v), '6-18 digit account number required')

const ifscField = z
  .string()
  .transform((v) => v.toUpperCase())
  .refine((v) => IFSC_RE.test(v), 'IFSC must be 11 chars (e.g. HDFC0001234)')

/** Wording used by the multi-account modals (prefixed with "Account N: "). */
export const bankAccountSchema = z.object({
  accountName: z.string().trim().min(1, 'holder name required'),
  accountNumber: accountNumberField,
  ifsc: ifscField,
  chequeUrl: z.string().min(1, 'cancelled cheque is mandatory'),
})

/** Wording used by the single-account Add dialog (unprefixed, sentence case). */
export const singleBankAccountSchema = z.object({
  accountName: z.string().trim().min(1, 'Account holder name is required'),
  accountNumber: accountNumberField,
  ifsc: ifscField,
  chequeUrl: z.string().min(1, 'Cancelled cheque is mandatory'),
})

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>

type ValidateResult =
  | { ok: true; value: BankAccountFormValues }
  | { ok: false; error: string }

function runSchema(
  schema: typeof bankAccountSchema | typeof singleBankAccountSchema,
  account: Partial<DietitianBankAccount>,
  prefix?: string,
): ValidateResult {
  const parsed = schema.safeParse({
    accountName: account.accountName ?? '',
    accountNumber: account.accountNumber ?? '',
    ifsc: account.ifsc ?? '',
    chequeUrl: account.chequeUrl ?? '',
  })
  if (parsed.success) return { ok: true, value: parsed.data }
  const message = parsed.error.issues[0]?.message ?? 'Invalid bank account'
  return { ok: false, error: prefix ? `${prefix}: ${message}` : message }
}

/** Validate one row of a multi-account form. `prefix` is e.g. "Account 2". */
export function validateBankAccount(account: Partial<DietitianBankAccount>, prefix: string): ValidateResult {
  return runSchema(bankAccountSchema, account, prefix)
}

/** Validate the single-account Add dialog. */
export function validateSingleBankAccount(account: Partial<DietitianBankAccount>): ValidateResult {
  return runSchema(singleBankAccountSchema, account)
}

/** True when the row is entirely empty — such rows are skipped, not rejected. */
export function isBlankBankAccount(a: Partial<DietitianBankAccount>): boolean {
  return !(a.accountName || a.accountNumber || a.ifsc || a.chequeUrl)
}
