import { useGetEntity } from '@/hooks/useGetEntity'
import { patientService } from '@/features/clinical/patient/patient.service'
import { patientKeys } from '@/features/clinical/patient/hooks/usePatients'

export const usePatient = (id: string | undefined) => useGetEntity(patientKeys.detail, patientService.getPatient, id)
