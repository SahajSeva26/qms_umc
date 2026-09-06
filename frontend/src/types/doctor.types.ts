// Doctor is tenant-scoped — a customer-tenant caller is pinned to their own
// tenant server-side; a platform caller must supply one explicitly.
export type DoctorSpecialization = 'cp' | 'gp'
export type DoctorStatus = 'active' | 'inactive'

/** `status` is only present when the caller holds `doctor:manage`; search()
 * also hard-scopes non-manage callers to status=active regardless of the `status` filter. */
export interface DoctorEntity {
  id: string
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  email: string
  city: string
  state: string
  pincode: string
  googleMapLink: string
  createdAt: string
  updatedAt: string
  status?: DoctorStatus
  // Populated only on search() — create/update/get return the raw ObjectId string.
  tenant: string | { _id?: string; name: string; code: string }
}

export interface SearchDoctorQuery {
  name?: string
  specialization?: DoctorSpecialization
  status?: DoctorStatus
  city?: string
  state?: string
  pharmaCode?: string
  page?: string
  limit?: string
  // Only honored server-side for a platform caller — a customer caller is
  // always hard-scoped to their own tenant regardless of this filter.
  tenant?: string
}

// pharmaCode is the immutable natural key — required on create, never editable afterwards.
export interface CreateDoctorPayload {
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  city: string
  state: string
  pincode: string
  email: string
  googleMapLink?: string
  status?: DoctorStatus
  // Required for a platform caller (backend 400s without it); ignored for a
  // customer caller, who is always pinned to their own tenant server-side.
  tenant?: string
}

export interface UpdateDoctorPayload {
  name?: string
  specialization?: DoctorSpecialization
  mobile?: string
  city?: string
  state?: string
  pincode?: string
  email?: string
  googleMapLink?: string
  status?: DoctorStatus
}

// `tenant` is only sent/needed for a PLATFORM-type session — a customer
// session is always pinned to its own tenant server-side.
export interface BulkDoctorPayload {
  tenant?: string
  file: File
}

// Covers BOTH schema-invalid rows (ZodError-shaped) and DB-layer create
// failures (plain string), unlike MR-bulk's errors array (DB-layer only).
export interface BulkDoctorRowError {
  row: number
  error: string | Record<string, unknown>
}

// Unlike BulkMrResult, doctor bulk's 400 response returns this FULL shape —
// every count field here is a real number on either the 200 or 400 path.
export interface BulkDoctorResult {
  totalRows: number
  validRows: number
  invalidRows: number
  created: number
  failed: number
  errors: BulkDoctorRowError[]
}
