import { useFilterState } from '@/hooks/useFilterState'
import type { UserStatus } from '@/features/admin/user.types'

export interface UsersFilterState {
  search: string
  // No 'ALL' sentinel — GET /users has no way to request every status in one call.
  status: UserStatus
  tenant: string
}

const DEFAULT_FILTERS: UsersFilterState = {
  search: '',
  status: 'active',
  tenant: 'ALL',
}

export const useUsersFilters = () => useFilterState<UsersFilterState>(DEFAULT_FILTERS)
