import { useFilterState } from '@/hooks/useFilterState'
import type { DivisionStatus, DivisionTherapy } from '@/features/crm/crm.types'

// Default status is 'active', not an 'ALL' sentinel — the backend always
// force-scopes to active unless the caller holds division:manage/tenant:manage.
export type DivisionsSearchBy = 'name' | 'code'

export interface DivisionsFilterState {
  search: string
  code: string
  // Which field the single search box currently searches by; both fields
  // stay in state so switching modes never loses what was typed.
  searchBy: DivisionsSearchBy
  status: DivisionStatus
  therapy: DivisionTherapy | 'ALL'
}

const DEFAULT_FILTERS: DivisionsFilterState = {
  search: '',
  code: '',
  searchBy: 'name',
  status: 'active',
  therapy: 'ALL',
}

export const useDivisionsFilters = () => useFilterState<DivisionsFilterState>(DEFAULT_FILTERS)
