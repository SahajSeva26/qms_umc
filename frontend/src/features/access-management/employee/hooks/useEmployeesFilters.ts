import { useFilterState } from '@/hooks/useFilterState'
import type { EmployeeStatus, EmployeeType } from '@/types/accessManagement.types'

export interface EmployeesFilterState {
  search: string
  type: EmployeeType | 'ALL'
  status: EmployeeStatus | 'ALL'
  tenant: string
}

const DEFAULT_FILTERS: EmployeesFilterState = {
  search: '',
  type: 'ALL',
  status: 'ALL',
  tenant: 'ALL',
}

export const useEmployeesFilters = () => useFilterState<EmployeesFilterState>(DEFAULT_FILTERS)
