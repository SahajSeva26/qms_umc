// Mirrors bookCampPayloadSchema's patientExpectation rule — used by callers (MrBookCampTab) that
// own this field outside BookCampForm's RHF form, so an invalid value gets a visible error.
export function parsePatientExpectation(input: string): { value: number | undefined; error: string | null } {
  const trimmed = input.trim()
  if (trimmed === '') return { value: undefined, error: null }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return { value: undefined, error: 'Must be a number.' }
  if (!Number.isInteger(value)) return { value: undefined, error: 'Must be a whole number.' }
  if (value < 0) return { value: undefined, error: 'Must be 0 or more.' }

  return { value, error: null }
}
