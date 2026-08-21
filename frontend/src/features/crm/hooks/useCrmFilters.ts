import { useFilterState } from '@/hooks/useFilterState'
import type { LeadStatus } from '@/types/crm.types'

export interface CrmFilterState {
  status: LeadStatus | ''
  q: string
}

const DEFAULT_FILTERS: CrmFilterState = { status: '', q: '' }

export const useCrmFilters = () => useFilterState<CrmFilterState>(DEFAULT_FILTERS)
