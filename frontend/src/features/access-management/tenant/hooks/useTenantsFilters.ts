import { useFilterState } from '@/hooks/useFilterState'
import type { TenantStatus, TenantType } from '@/types/accessManagement.types'

export interface TenantsFilterState {
  search: string
  status: TenantStatus | 'ALL'
  // Only shown/settable for system:manage — others stay hard-defaulted to 'customer'.
  type: TenantType | 'ALL'
}

const DEFAULT_FILTERS: TenantsFilterState = {
  search: '',
  status: 'ALL',
  type: 'customer',
}

export const useTenantsFilters = () => useFilterState<TenantsFilterState>(DEFAULT_FILTERS)
