// Resolves a Camp reference field to a plain id, whether populated or a bare ObjectId string.
export function campRefId(value: { _id?: string; id?: string } | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  return value._id ?? value.id ?? null
}

// Null for a bare id string, so the caller falls back to a resolver-hook lookup instead.
export function campRefName(value: { name?: string } | string | null | undefined): string | null {
  if (value == null || typeof value === 'string') return null
  return value.name ?? null
}

// Mirrors the backend's assertAssignedFoOrManage — id match alone isn't enough, roleType must be 'field-officer'.
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

// Replaces any existing `camp` param on the return path rather than appending a second one.
export function withCampParam(returnTo: string, campId: string): string {
  const [path, query = ''] = returnTo.split('?')
  const params = new URLSearchParams(query)
  params.set('camp', campId)
  return `${path}?${params.toString()}`
}

// Zod failures respond with data.data.fields (per-field reasons); fall back to the plain message otherwise.
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
