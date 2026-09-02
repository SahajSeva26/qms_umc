import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { patientService } from '@/features/clinical/patient/patient.service'
import { patientKeys } from '@/features/clinical/patient/hooks/usePatients'
import type { UpdatePatientPayload } from '@/features/clinical/patient/patient.types'

export const useUpdatePatient = (id: string) =>
  useUpdateEntity((payload: UpdatePatientPayload) => patientService.updatePatient(id, payload), [patientKeys.all, patientKeys.detail(id)])
