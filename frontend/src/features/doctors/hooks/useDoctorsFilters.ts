import { useState } from 'react'
import type { DoctorSpecialization, DoctorStatus } from '@/types/doctor.types'

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

// Mirrors `@/features/access-management/role/hooks/useRolesFilters.ts` exactly.
export const useDoctorsFilters = () => {
  const [filters, setFilters] = useState<DoctorsFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof DoctorsFilterState>(key: K, value: DoctorsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
