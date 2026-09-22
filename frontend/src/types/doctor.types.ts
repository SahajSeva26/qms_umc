// Doctor is tenant-scoped — a customer-tenant caller is pinned to their own
// tenant server-side; a platform caller must supply one explicitly.
import type { LocationValue } from '@/types/location.types'

export type DoctorSpecialization = 'cp' | 'gp'
export type DoctorStatus = 'active' | 'inactive'

// coordinates is guaranteed present here, unlike the shared LocationValue (which keeps it
// optional for callers mid-edit before a pin has been dropped).
export type DoctorLocation = LocationValue & { coordinates: [number, number] }

// A populated division looks like { _id, name, code, therapy } (doctor.service.ts's populate
// select) — mirrors the existing `tenant` union's shape/reasoning exactly.
export type DoctorDivision = string | { _id?: string; name: string; code: string; therapy?: string[] }

/** `status` is only present when the caller holds `doctor:manage`; search()
 * also hard-scopes non-manage callers to status=active regardless of the `status` filter. */
export interface DoctorEntity {
  id: string
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  email: string
  // Only search()/search-populated results resolve this to { _id, name, code, therapy } — a raw
  // GET /doctors/:id (no populate:true passed by the controller) returns the bare id. Optional +
  // nullable: a pre-division-scoping doctor record has no division key at all (omitted in JSON,
  // not `null`), and a populated-but-hard-deleted Division resolves to a real `null` via Mongoose.
  division?: DoctorDivision | null
  // Doctors created before location was added have no location at all — the mapper returns
  // `doctor.location || null`, never assume this is always present.
  location: DoctorLocation | null
  createdAt: string
  updatedAt: string
  status?: DoctorStatus
  // Populated only on search() — create/update/get return the raw ObjectId string.
  tenant: string | { _id?: string; name: string; code: string }
  // Only present on /doctors/nearest results — rounded meters, or explicitly null (never omitted
  // on that endpoint) when the aggregation produced no numeric distance.
  distanceMeters?: number | null
}

export interface SearchDoctorQuery {
  name?: string
  specialization?: DoctorSpecialization
  status?: DoctorStatus
  // Flat regex filters against location.city/location.state — the search QUERY shape stays flat
  // by backend design even though the entity's own location is nested.
  city?: string
  state?: string
  pharmaCode?: string
  division?: string
  page?: string
  limit?: string
  // Only honored server-side for a platform caller — a customer caller is
  // always hard-scoped to their own tenant regardless of this filter.
  tenant?: string
}

// The 35km radius is server-fixed — no radius/range param exists.
export interface NearestDoctorQuery {
  lng: number
  lat: number
  specialization?: DoctorSpecialization
  limit?: string
}

// pharmaCode is the immutable natural key — required on create, never editable afterwards.
// division is required going forward on every new create, even though existing entities may lack it.
// email is REQUIRED on create — CreateDoctorPayloadSchema's `email: z.email()` has no `.optional()`.
export interface CreateDoctorPayload {
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  email: string
  location: DoctorLocation
  division: string
  status?: DoctorStatus
  // Required for a platform caller (backend 400s without it); ignored for a
  // customer caller, who is always pinned to their own tenant server-side.
  tenant?: string
}

export interface UpdateDoctorPayload {
  name?: string
  specialization?: DoctorSpecialization
  mobile?: string
  email?: string
  // Optional, but if present must be the complete object — the backend replaces it wholesale,
  // no partial/deep merge.
  location?: DoctorLocation
  status?: DoctorStatus
}

// `tenant` is only sent/needed for a PLATFORM-type session — a customer
// session is always pinned to its own tenant server-side. `division` is required — one upload
// targets one division for every row in the file.
export interface BulkDoctorPayload {
  tenant?: string
  division: string
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
