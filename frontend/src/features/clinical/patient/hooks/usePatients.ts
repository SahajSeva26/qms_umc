import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { patientService } from '@/features/clinical/patient/patient.service'
import type { SearchPatientQuery } from '@/features/clinical/patient/patient.types'

export const patientKeys = createEntityKeys<SearchPatientQuery>('patients', 'patient')

export const usePatients = (query: SearchPatientQuery, enabled = true) =>
  useEntityQuery(patientKeys, (q) => patientService.searchPatients(q), query, { enabled })
