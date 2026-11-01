// Mirrors bookCampPayloadSchema's own patientExpectation rule (z.number().int().nonnegative().optional())
// — used by callers that own this field OUTSIDE BookCampForm's RHF form (MrBookCampTab,
// TypeScopedPharmaCampsPage), so an invalid value gets a visible error instead of silently
// failing Zod validation deep inside BookCampForm's onSubmit with no rendered feedback.
export function parsePatientExpectation(input: string): { value: number | undefined; error: string | null } {
  const trimmed = input.trim()
  if (trimmed === '') return { value: undefined, error: null }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return { value: undefined, error: 'Must be a number.' }
  if (!Number.isInteger(value)) return { value: undefined, error: 'Must be a whole number.' }
  if (value < 0) return { value: undefined, error: 'Must be 0 or more.' }

  return { value, error: null }
}
