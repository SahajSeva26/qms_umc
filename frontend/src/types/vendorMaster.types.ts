// Matches backend/vendor-master exactly — a global, platform-only registry (no tenant scoping).
// Deliberately unrelated to the older mock-data scorecard in features/inventory/inventory.types.ts.
import type { LocationValue } from '@/types/location.types'

export type VendorStatus = 'active' | 'inactive'

export interface VendorContact {
  name: string
  number?: string
  email?: string
  designation?: string
}

export interface VendorMasterEntity {
  id: string
  code: string
  name: string
  // Always a real array — the backend schema defaults this to [], never absent.
  contacts: VendorContact[]
  // Absent (not null) when the vendor was never given one — no default on the backend schema.
  address?: LocationValue
  createdAt: string
  updatedAt: string
  // Key is ABSENT unless the caller holds `vendor-master:manage` — the mapper sets it conditionally.
  status?: VendorStatus
}

export interface SearchVendorMasterQuery {
  name?: string
  code?: string
  city?: string
  status?: VendorStatus
  page?: string
  limit?: string
}

export interface CreateVendorMasterPayload {
  code: string
  name: string
  contacts?: VendorContact[]
  address?: LocationValue
  status?: VendorStatus
}

export interface UpdateVendorMasterPayload {
  // `code` is intentionally absent — immutable post-create.
  name?: string
  contacts?: VendorContact[]
  address?: LocationValue
  status?: VendorStatus
}
