// Lean, feature-local slice of the backend Role shape — just enough for the on-behalf-of MR
// picker. Not a full RoleEntity (internal-frontend's admin-grade shape); pharma-frontend has no
// other use for the Role resource.

export interface MrPopulatedDivision {
  _id?: string
  name: string
  code: string
}

export interface EligibleMr {
  id: string
  code: string
  name: string
  division?: MrPopulatedDivision | string | null
}

// GET /roles/mrs — the caller's own downline MRs (pharma HO/RSM/ASM only, enforced server-side).
// `name` matches the linked user's name/email, not the role's own name.
export interface SearchDownlineMrQuery {
  name?: string
  page?: string
  limit?: string
}
