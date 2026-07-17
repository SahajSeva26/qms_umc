import { useState } from 'react'
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

export const useRolesFilters = () => {
  const [filters, setFilters] = useState<RolesFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof RolesFilterState>(key: K, value: RolesFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
