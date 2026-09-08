import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { CreatePatientPayload, PatientEntity, SearchPatientQuery, UpdatePatientPayload } from '@/features/clinical/patient/patient.types'

const searchPatients = async (query: SearchPatientQuery) => {
  const res = await api.get<PaginatedResponse<PatientEntity>>('/patients', { params: query })
  return res.data
}

const getPatient = async (id: string) => {
  const res = await api.get<ApiResponse<PatientEntity>>(`/patients/${id}`)
  return res.data
}

const createPatient = async (payload: CreatePatientPayload) => {
  const res = await api.post<ApiResponse<PatientEntity>>('/patients', payload)
  return res.data
}

const updatePatient = async (id: string, payload: UpdatePatientPayload) => {
  const res = await api.put<ApiResponse<PatientEntity>>(`/patients/${id}`, payload)
  return res.data
}

export const patientService = {
  searchPatients,
  getPatient,
  createPatient,
  updatePatient,
}
