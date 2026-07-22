import { useState } from 'react'
import type { PermissionGroupStatus } from '@/types/accessManagement.types'

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

// Same shape as useRoleTypesFilters.ts — one useState bag, a setFilter
// setter, a reset back to defaults.
export const usePermissionGroupsFilters = () => {
  const [filters, setFilters] = useState<PermissionGroupsFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof PermissionGroupsFilterState>(key: K, value: PermissionGroupsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
