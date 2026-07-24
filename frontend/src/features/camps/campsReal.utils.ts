// Resolves a Camp reference field (tenant/division/project/doctor/fo/mr/asm/
// rsm) to a plain id string regardless of whether the value is a populated
// object (search()/get(), which pass {populate:true}) or a bare ObjectId
// string (create()/update()/moveStage()/allocateFo(), which never populate)
// — see campReal.types.ts's CampEntity comment for why both shapes occur.
export function campRefId(value: { _id?: string; id?: string } | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  return value._id ?? value.id ?? null
}

// Reads a populated object's own display name directly (avoiding a lookup
// table entirely) when the value IS populated — falls back to null when it's
// only a bare id string, so the caller can fall back to a resolver-hook
// lookup by id instead.
export function campRefName(value: { name?: string } | string | null | undefined): string | null {
  if (value == null || typeof value === 'string') return null
  return value.name ?? null
}
