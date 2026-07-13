import { useState } from 'react'

export interface CampsFilterState {
  from: string
  to: string
  status: string
  type: string
  client: string
  doctor: string
  fo: string
  search: string
}

const DEFAULT_FILTERS: CampsFilterState = {
  from: '',
  to: '',
  status: 'ALL',
  type: 'ALL',
  client: 'ALL',
  doctor: 'ALL',
  fo: 'ALL',
  search: '',
}

export const useCampsFilters = () => {
  const [filters, setFilters] = useState<CampsFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof CampsFilterState>(key: K, value: CampsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
