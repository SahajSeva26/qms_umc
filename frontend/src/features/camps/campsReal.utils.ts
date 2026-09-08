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

// Mirrors the backend's own assertAssignedFoOrManage rule (screening.service.ts)
// EXACTLY: a screening:manage/system:manage holder always qualifies; otherwise
// BOTH the viewer's own role id must match the camp's assigned fo AND their
// roleType must be 'field-officer' — the backend checks `isFoType` and
// `isAssigned` together (`if (!isFoType || !isAssigned) throw...`), not id
// equality alone. Without the roleType check, a non-FO role that happened to
// match camp.fo (a stale reference, a role type later changed, a future bug
// elsewhere that assigns the wrong kind of role as `fo`) would wrongly show
// this action in the UI for a request the backend would 403. Kept in sync
// deliberately so the UI never shows an action a request would 403 on.
export function canRunScreening(
  camp: { fo: { _id?: string; id?: string } | string | null },
  viewerRoleId: string | undefined,
  viewerRoleTypeCode: string | undefined,
  canManageScreening: boolean,
): boolean {
  if (canManageScreening) return true
  if (!viewerRoleId || viewerRoleTypeCode !== 'field-officer') return false
  return campRefId(camp.fo) === viewerRoleId
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
