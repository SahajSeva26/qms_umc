import { useState } from 'react'
import type { LeadStatus } from '@/types/crm.types'

export interface CrmFilterState {
  status: LeadStatus | ''
  q: string
}

const DEFAULT_FILTERS: CrmFilterState = { status: '', q: '' }

export const useCrmFilters = () => {
  const [filters, setFilters] = useState<CrmFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
