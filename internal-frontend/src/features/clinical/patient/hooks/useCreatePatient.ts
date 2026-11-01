import { useCreateEntity } from '@/hooks/useCreateEntity'
import { patientService } from '@/features/clinical/patient/patient.service'
import { patientKeys } from '@/features/clinical/patient/hooks/usePatients'
import type { CreatePatientPayload } from '@/features/clinical/patient/patient.types'

export const useCreatePatient = () =>
  useCreateEntity((payload: CreatePatientPayload) => patientService.createPatient(payload), patientKeys.all)
