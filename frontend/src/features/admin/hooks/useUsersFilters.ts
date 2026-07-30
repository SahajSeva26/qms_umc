import { useState } from 'react'
import type { UserStatus } from '@/types/user.types'

export interface UsersFilterState {
  search: string
  // No 'ALL' sentinel — GET /users has no way to request every status in one
  // call (it always defaults `where.status` to 'active' server-side and only
  // ever overrides, never clears, it — see user.service.ts). Defaulting the
  // UI to 'active' too means the common case is one real server-paginated
  // call instead of a 4-request client-side merge across every status value.
  status: UserStatus
  tenant: string
}

const DEFAULT_FILTERS: UsersFilterState = {
  search: '',
  status: 'active',
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
