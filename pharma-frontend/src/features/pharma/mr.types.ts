// Lean, feature-local slice of the backend Role shape — just enough for the on-behalf-of MR
// picker. Not a full RoleEntity (internal-frontend's admin-grade shape); pharma-frontend has no
// other use for the Role resource.

export interface MrPopulatedDivision {
  _id?: string
  name: string
  code: string
}

// Populated via role.service.ts's `user` populate ({firstName, lastName, email, phone, gender,
// status} — select list confirmed in role.service.ts). A bulk-imported MR's own `role.name` is a
// literal placeholder ("pharma-mr role for Priya"), never the real person's name — see
// division.service.ts's bulk-import row builder — so the real display name is the linked user's,
// with role.name only as a last-resort fallback when user is unpopulated/missing.
export interface MrPopulatedUser {
  _id?: string
  firstName?: string
  lastName?: string
  email?: string
}

export interface EligibleMr {
  id: string
  code: string
  /** The role's own name — a placeholder for bulk-imported MRs, see MrPopulatedUser's comment.
   * Prefer displayMrName(mr) over this field directly. */
  name: string
  user?: MrPopulatedUser | string | null
  division?: MrPopulatedDivision | string | null
}

/** The MR's real display name — the linked user's name when populated, falling back to the
 * role's own `name` (correct for a manually-created role, a placeholder for a bulk-imported one). */
export function displayMrName(mr: Pick<EligibleMr, 'name' | 'user'>): string {
  if (mr.user && typeof mr.user !== 'string') {
    const fullName = [mr.user.firstName, mr.user.lastName].filter(Boolean).join(' ').trim()
    if (fullName) return fullName
  }
  return mr.name
}

// GET /roles/mrs — the caller's own downline MRs (pharma HO/RSM/ASM only, enforced server-side).
// `name` matches the linked user's name/email, not the role's own name.
export interface SearchDownlineMrQuery {
  name?: string
  page?: string
  limit?: string
}
