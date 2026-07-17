import { useState } from 'react'

export interface CrmFilterState {
  stage: string
  therapy: string
  owner: string
  q: string
}

const DEFAULT_FILTERS: CrmFilterState = { stage: '', therapy: '', owner: '', q: '' }

export const useCrmFilters = () => {
  const [filters, setFilters] = useState<CrmFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
