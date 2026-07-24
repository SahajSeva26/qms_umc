import { useState } from 'react'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

export interface CampsRealFilterState {
  status: CampStatus | 'ALL'
  type: CampType | 'ALL'
  billingType: BillingType | 'ALL'
  city: string
  state: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: CampsRealFilterState = {
  status: 'ALL',
  type: 'ALL',
  billingType: 'ALL',
  city: '',
  state: '',
  dateFrom: '',
  dateTo: '',
}

export const useCampsRealFilters = () => {
  const [filters, setFilters] = useState<CampsRealFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof CampsRealFilterState>(key: K, value: CampsRealFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
