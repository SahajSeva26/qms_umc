import { useFilterState } from '@/hooks/useFilterState'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

// Trimmed from internal-frontend's useCampsRealFilters.ts — no clientId/clientLabel (the
// tenant/client filter is camp:manage-only server-side; no pharma role holds that permission).
export interface CampManagementFilterState {
  status: CampStatus | 'ALL'
  type: CampType | 'ALL'
  billingType: BillingType | 'ALL'
  code: string
  city: string
  state: string
  dateFrom: string
  dateTo: string
  // Resolved via DoctorAsyncPicker (name→id) — a real ObjectId filter server-side.
  doctorId: string
  doctorLabel: string
}

const DEFAULT_FILTERS: CampManagementFilterState = {
  status: 'ALL',
  type: 'ALL',
  billingType: 'ALL',
  code: '',
  city: '',
  state: '',
  dateFrom: '',
  dateTo: '',
  doctorId: '',
  doctorLabel: '',
}

export const useCampManagementFilters = () => useFilterState<CampManagementFilterState>(DEFAULT_FILTERS)
