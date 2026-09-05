// Doctor domain types — mirrors the real backend exactly:
// backend/src/modules/doctor/{doctor.model,doctor.constants,doctor.validators}.ts
//
// Doctor is tenant-scoped (tenant is required, indexed) — a customer-tenant
// caller is pinned to their own tenant server-side; a platform caller must
// supply one explicitly. Reads are open to any authenticated user; only
// create/update require `doctor:manage`.

export type DoctorSpecialization = 'cp' | 'gp'
export type DoctorStatus = 'active' | 'inactive'

/**
 * NOTE: per backend DoctorMapper, `status` is only present when the caller
 * holds `doctor:manage` — everyone else gets every other field but not status
 * (search() also silently hard-scopes non-manage callers to status=active,
 * regardless of what they request via the `status` filter).
 *
 * `tenant` is populated (`{_id, name, code}`) only on search() — create/
 * update/get all return the raw ObjectId string, since none of them populate.
 */
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
  // TODO: only present server-side if caller has `doctor:manage` (mapper gate).
  status?: DoctorStatus
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

// pharmaCode is the immutable natural key — required on create, never
// editable afterwards (see UpdateDoctorPayload below, and doctor.service.ts's
// own comment: "pharmaCode is intentionally omitted — it is immutable after create").
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

// Batch-level fields for POST /doctors/bulk, sent as multipart form fields
// alongside the CSV `file`. `tenant` is only sent/needed for a PLATFORM-type
// session — a customer session is always pinned to its own tenant server-side.
export interface BulkDoctorPayload {
  tenant?: string
  file: File
}

// One entry in the bulk-import `errors` array — covers BOTH schema-invalid
// rows (error is a ZodError-shaped object) and DB-layer create failures
// (error is a plain string), unlike MR-bulk's errors array which only ever
// covers DB-layer failures.
export interface BulkDoctorRowError {
  row: number
  error: string | Record<string, unknown>
}

// Unlike BulkMrResult, doctor bulk's 400 (partial-failure) response returns
// this FULL shape, not just a bare errors array — so every count field here
// is always a real number, never undefined, on either the 200 or 400 path.
export interface BulkDoctorResult {
  totalRows: number
  validRows: number
  invalidRows: number
  created: number
  failed: number
  errors: BulkDoctorRowError[]
}
