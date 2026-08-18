// Resolves a Camp reference field to a plain id string regardless of whether
// the value is a populated object or a bare ObjectId string (see campReal.types.ts).
export function campRefId(value: { _id?: string; id?: string } | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  return value._id ?? value.id ?? null
}

// Returns the populated object's own name directly; null for a bare id string
// so the caller can fall back to a resolver-hook lookup by id instead.
export function campRefName(value: { name?: string } | string | null | undefined): string | null {
  if (value == null || typeof value === 'string') return null
  return value.name ?? null
}

// Zod validation failures respond with data.data.fields (per-field reasons),
// not a specific top-level message; fall back to the plain message otherwise.
export function saveErrorMessage(err: unknown): string {
  const response = (err as { response?: { data?: { message?: string; data?: { fields?: Record<string, string> } } } })
    ?.response
  const fields = response?.data?.data?.fields
  if (fields && Object.keys(fields).length > 0) {
    return Object.entries(fields)
      .map(([field, reason]) => `${field}: ${reason}`)
      .join('; ')
  }
  return response?.data?.message || 'Failed to save changes.'
}
