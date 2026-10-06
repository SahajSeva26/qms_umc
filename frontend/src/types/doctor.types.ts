// Doctor is tenant-scoped — a customer-tenant caller is pinned to their own
// tenant server-side; a platform caller must supply one explicitly.
import type { LocationValue } from '@/types/location.types'

// Mirrors DOCTOR_SPECIALIZATION (backend doctor.constants.ts) exactly.
export type DoctorSpecialization =
  | 'cp'
  | 'gp'
  | 'endocrinologist'
  | 'cardiologist'
  | 'pulmonologist'
  | 'orthopedic'
  | 'gynecologist'
  | 'neurologist'
  | 'hepatologist'
  | 'ophthalmologist'
  | 'chest_physician'
  | 'nephrologist'

// Single source of truth for every specialization picker/filter/label in the app — cp/gp keep
// their established short label, the rest are spelled out. Lives here (not a feature's own ui.ts)
// so both feature-owned and cross-feature/shared widget components can import it without
// violating the project's feature-boundary convention.
export const SPECIALIZATION_OPTIONS: { value: DoctorSpecialization; label: string }[] = [
  { value: 'cp', label: 'CP' },
  { value: 'gp', label: 'GP' },
  { value: 'endocrinologist', label: 'Endocrinologist' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'pulmonologist', label: 'Pulmonologist' },
  { value: 'orthopedic', label: 'Orthopedic' },
  { value: 'gynecologist', label: 'Gynecologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'hepatologist', label: 'Hepatologist' },
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'chest_physician', label: 'Chest Physician' },
  { value: 'nephrologist', label: 'Nephrologist' },
]

export const SPECIALIZATION_LABEL: Record<DoctorSpecialization, string> = Object.fromEntries(
  SPECIALIZATION_OPTIONS.map((o) => [o.value, o.label]),
) as Record<DoctorSpecialization, string>

// For a populate-shape `specialization?: string` (e.g. CampPopulatedDoctor) rather than the
// proper DoctorSpecialization union — falls back to the raw value for a stale/unrecognized one
// instead of crashing or silently showing nothing.
export function specializationLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return SPECIALIZATION_LABEL[value as DoctorSpecialization] ?? value
}

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
  // Only search() populates this; GET /doctors/:id returns the bare id. A pre-division-scoping
  // doctor has no key at all; a populated-but-hard-deleted Division resolves to a real `null`.
  division?: DoctorDivision | null
  // Doctors created before location was added have no location at all — the mapper returns
  // `doctor.location || null`, never assume this is always present.
  location: DoctorLocation | null
  createdAt: string
  updatedAt: string
  status?: DoctorStatus
  // Populated only on search() — create/update/get return the raw ObjectId string.
  tenant: string | { _id?: string; name: string; code: string }
  // Only present on /doctors/nearest results — rounded meters, or null when no numeric distance was produced.
  distanceMeters?: number | null
  // Only present when search() was called with report=true.
  stats?: DoctorStats
}

export interface DoctorStats {
  camps: number
  patients: number
  patientsCompleted: number
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
  // When 'true', each item gets a `stats` object (see DoctorStats).
  report?: 'true' | 'false'
}

// Mirrors DOCTOR_NEAREST_MAX_DISTANCE (doctor.constants.ts) in km, for a client-side
// "is this doctor within range of this camp location" check (e.g. after overriding the camp
// location away from the picked doctor's own address) — no backend round-trip needed for that.
export const DOCTOR_RANGE_KM = 35

// The 35km radius is server-fixed — no radius/range param exists.
export interface NearestDoctorQuery {
  lng: number
  lat: number
  specialization?: DoctorSpecialization
  limit?: string
}

// pharmaCode is the immutable natural key. email is REQUIRED on create (no `.optional()` in the schema).
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

// `tenant` is only sent/needed for a platform-type session. `division` is required — one upload targets one division.
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
