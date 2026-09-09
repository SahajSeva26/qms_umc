// Brand domain types — mirrors the real backend exactly (backend/src/modules/crm/brand/**).
// Replaces the old Division.brandFocus free-text field with a real, division-scoped entity.

export type BrandStatus = 'active' | 'inactive'

/** Populated shape for Brand.division — nested relations carry Mongoose's raw `_id`, not a mapped `id`. */
export interface BrandPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: string[]
}

/** Populated shape for Brand.tenant. */
export interface BrandPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface BrandEntity {
  id: string
  // Populated as {_id, name, code} on GET/search (both requests always populate).
  tenant: BrandPopulatedTenant | string
  // Required, immutable post-create. Populated as {_id, name, code, therapy}.
  division: BrandPopulatedDivision | string
  name: string
  // Derived server-side from `name` (lowercased, whitespace stripped) — never client-settable.
  code: string
  description?: string
  molecule?: string
  notes?: string
  color?: string
  status: BrandStatus
  createdAt: string
  updatedAt: string
}

export interface SearchBrandQuery {
  name?: string
  code?: string
  status?: BrandStatus
  // Platform-staff-only filter — service.ts pins customer-tenant callers regardless.
  tenant?: string
  division?: string
  page?: string
  limit?: string
}

// tenant is NOT accepted here — derived server-side from `division` (the
// pharma company, source of truth), never trusted from the caller.
export interface CreateBrandPayload {
  division: string
  name: string
  description?: string
  molecule?: string
  notes?: string
  color?: string
}

// division/tenant are immutable post-create, so absent here.
export interface UpdateBrandPayload {
  name?: string
  description?: string
  molecule?: string
  notes?: string
  color?: string
  status?: BrandStatus
}
