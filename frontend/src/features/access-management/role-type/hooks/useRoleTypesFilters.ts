import { useFilterState } from '@/hooks/useFilterState'
import type { RoleTypeStatus } from '@/features/access-management/accessManagement.types'

export interface RoleTypesFilterState {
  search: string
  status: RoleTypeStatus | 'ALL'
  tenant: string
}

const DEFAULT_FILTERS: RoleTypesFilterState = {
  search: '',
  status: 'ALL',
  tenant: 'ALL',
}

export const useRoleTypesFilters = () => useFilterState<RoleTypesFilterState>(DEFAULT_FILTERS)
