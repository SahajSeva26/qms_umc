import { useFilterState } from '@/hooks/useFilterState'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

export interface CampsRealFilterState {
  status: CampStatus | 'ALL'
  type: CampType | 'ALL'
  billingType: BillingType | 'ALL'
  code: string
  city: string
  state: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: CampsRealFilterState = {
  status: 'ALL',
  type: 'ALL',
  billingType: 'ALL',
  code: '',
  city: '',
  state: '',
  dateFrom: '',
  dateTo: '',
}

export const useCampsRealFilters = () => useFilterState<CampsRealFilterState>(DEFAULT_FILTERS)
