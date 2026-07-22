import { useState } from 'react'
import type { DivisionStatus, DivisionTherapy } from '@/types/crm.types'

export interface DivisionsFilterState {
  search: string
  status: DivisionStatus | 'ALL'
  therapy: DivisionTherapy | 'ALL'
}

const DEFAULT_FILTERS: DivisionsFilterState = {
  search: '',
  status: 'ALL',
  therapy: 'ALL',
}

export const useDivisionsFilters = () => {
  const [filters, setFilters] = useState<DivisionsFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof DivisionsFilterState>(key: K, value: DivisionsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
