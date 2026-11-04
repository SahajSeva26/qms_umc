interface HasId {
  _id?: string
}

// Many backend responses populate a relation as either a bare ObjectId string
// or the populated document — this resolves either shape down to just the id.
export function unwrapId<T extends HasId, F = string>(value: string | T | null | undefined, fallback: F = '' as F): string | F {
  if (!value) return fallback
  return typeof value === 'string' ? value : (value._id ?? fallback)
}
