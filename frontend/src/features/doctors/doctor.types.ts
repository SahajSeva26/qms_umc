// Doctor domain types — mirrors the real backend exactly:
// backend/src/modules/doctor/{doctor.model,doctor.constants,doctor.validators}.ts
//
// Doctor is a global/system record (no tenant field, no populate chain) —
// confirmed via doctor.service.ts's own comment. Reads are open to any
// authenticated user; only create/update require `doctor:manage`.

export type DoctorSpecialization = 'cp' | 'gp'
export type DoctorStatus = 'active' | 'inactive'

/**
 * NOTE: per backend DoctorMapper, `status` is only present when the caller
 * holds `doctor:manage` — everyone else gets every other field but not status
 * (search() also silently hard-scopes non-manage callers to status=active,
 * regardless of what they request via the `status` filter).
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
