import { useFilterState } from '@/hooks/useFilterState'
import type { LeadStatus } from '@/types/crm.types'

export interface CrmFilterState {
  status: LeadStatus | ''
  q: string
  // ISO date strings (YYYY-MM-DD), or '' for unset.
  fyFrom: string
  fyTo: string
}

const DEFAULT_FILTERS: CrmFilterState = { status: '', q: '', fyFrom: '', fyTo: '' }

export const useCrmFilters = () => useFilterState<CrmFilterState>(DEFAULT_FILTERS)
