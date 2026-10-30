import { useFilterState } from '@/hooks/useFilterState'
import type { RoleStatus } from '@/types/accessManagement.types'

export interface RolesFilterState {
  search: string
  status: RoleStatus | 'ALL'
  tenant: string
}

const DEFAULT_FILTERS: RolesFilterState = {
  search: '',
  status: 'ALL',
  tenant: 'ALL',
}

export const useRolesFilters = () => useFilterState<RolesFilterState>(DEFAULT_FILTERS)
