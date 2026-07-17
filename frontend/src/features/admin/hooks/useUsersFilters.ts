import { useState } from 'react'
import type { UserStatus } from '@/types/user.types'

export interface UsersFilterState {
  search: string
  status: UserStatus | 'ALL'
  tenant: string
}

const DEFAULT_FILTERS: UsersFilterState = {
  search: '',
  status: 'ALL',
  tenant: 'ALL',
}

export const useUsersFilters = () => {
  const [filters, setFilters] = useState<UsersFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof UsersFilterState>(key: K, value: UsersFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
