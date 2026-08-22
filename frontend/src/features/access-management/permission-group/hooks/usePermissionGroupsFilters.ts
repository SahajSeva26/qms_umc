import { useFilterState } from '@/hooks/useFilterState'
import type { PermissionGroupStatus } from '@/features/access-management/accessManagement.types'

export interface PermissionGroupsFilterState {
  search: string
  status: PermissionGroupStatus | 'ALL'
  tenant: string
}

const DEFAULT_FILTERS: PermissionGroupsFilterState = {
  search: '',
  status: 'ALL',
  tenant: 'ALL',
}

export const usePermissionGroupsFilters = () => useFilterState<PermissionGroupsFilterState>(DEFAULT_FILTERS)
