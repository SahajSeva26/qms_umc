import { useFilterState } from '@/hooks/useFilterState'
import type { TenantStatus, TenantType } from '@/types/accessManagement.types'

export interface TenantsFilterState {
  search: string
  status: TenantStatus | 'ALL'
  // Only ever shown/settable in the UI for system:manage — everyone else
  // stays hard-defaulted to 'customer' regardless of this state's value.
  type: TenantType | 'ALL'
}

const DEFAULT_FILTERS: TenantsFilterState = {
  search: '',
  status: 'ALL',
  type: 'customer',
}

export const useTenantsFilters = () => useFilterState<TenantsFilterState>(DEFAULT_FILTERS)
