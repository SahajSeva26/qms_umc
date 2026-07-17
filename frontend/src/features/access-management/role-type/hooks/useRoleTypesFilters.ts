import { useState } from 'react'
import type { RoleTypeStatus } from '@/types/accessManagement.types'

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

export const useRoleTypesFilters = () => {
  const [filters, setFilters] = useState<RoleTypesFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof RoleTypesFilterState>(key: K, value: RoleTypesFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
