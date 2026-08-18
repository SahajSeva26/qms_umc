import { useFilterState } from '@/hooks/useFilterState'
import type { TenantStatus } from '@/types/accessManagement.types'

export interface TenantsFilterState {
  search: string
  status: TenantStatus | 'ALL'
}

const DEFAULT_FILTERS: TenantsFilterState = {
  search: '',
  status: 'ALL',
}

export const useTenantsFilters = () => useFilterState<TenantsFilterState>(DEFAULT_FILTERS)
