import { useFilterState } from '@/hooks/useFilterState'
import type { DoctorSpecialization, DoctorStatus } from '@/features/doctors/doctor.types'

export interface DoctorsFilterState {
  search: string
  specialization: DoctorSpecialization | 'ALL'
  status: DoctorStatus | 'ALL'
  city: string
  state: string
}

const DEFAULT_FILTERS: DoctorsFilterState = {
  search: '',
  specialization: 'ALL',
  status: 'ALL',
  city: '',
  state: '',
}

export const useDoctorsFilters = () => useFilterState<DoctorsFilterState>(DEFAULT_FILTERS)
