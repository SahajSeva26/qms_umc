import { useState } from 'react'
import type { TenantStatus } from '@/types/accessManagement.types'

export interface TenantsFilterState {
  search: string
  status: TenantStatus | 'ALL'
}

const DEFAULT_FILTERS: TenantsFilterState = {
  search: '',
  status: 'ALL',
}

// Same shape as useRoleTypesFilters.ts — one useState bag, a setFilter
// setter, a reset back to defaults.
export const useTenantsFilters = () => {
  const [filters, setFilters] = useState<TenantsFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof TenantsFilterState>(key: K, value: TenantsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
