// Patient is a global, tenantless registry — any FO/coordinator can find any
// patient across camps to avoid duplicate registration. No delete, status only.
export type PatientGender = 'male' | 'female' | 'other'
export type PatientStatus = 'active' | 'inactive'

export const PATIENT_GENDER_LABEL: Record<PatientGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export interface PatientAddress {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

interface PatientCreatedBy {
  id: string
  name?: string
  code?: string
}

export interface PatientEntity {
  id: string
  // Server-generated (pat-000001 format), never supplied by the caller. Immutable.
  code: string
  firstName: string
  middleName?: string
  lastName?: string
  dateOfBirth: string
  gender: PatientGender
  mobile: string
  email?: string
  address?: PatientAddress
  createdBy: PatientCreatedBy | null
  createdAt: string
  updatedAt: string
  // Key is absent entirely unless the caller holds `patient:manage`.
  status?: PatientStatus
}

export interface SearchPatientQuery {
  name?: string
  code?: string
  mobile?: string
  email?: string
  gender?: PatientGender
  status?: PatientStatus
  page?: string
  limit?: string
}

// code is intentionally absent — server-generated, never supplied by the caller.
export interface CreatePatientPayload {
  firstName: string
  middleName?: string
  lastName?: string
  dateOfBirth: string
  gender: PatientGender
  mobile: string
  email?: string
  address?: PatientAddress
  status?: PatientStatus
}

// code is intentionally absent — immutable after create.
export interface UpdatePatientPayload {
  firstName?: string
  middleName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: PatientGender
  mobile?: string
  email?: string
  address?: PatientAddress
  status?: PatientStatus
}
