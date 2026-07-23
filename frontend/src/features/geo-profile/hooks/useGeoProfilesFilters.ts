import { useState } from 'react'
import type { GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'

export interface GeoProfilesFilterState {
  type: GeoProfileType | 'ALL'
  status: GeoProfileStatus | 'ALL'
}

const DEFAULT_FILTERS: GeoProfilesFilterState = { type: 'ALL', status: 'ALL' }

// Mirrors `@/features/access-management/role/hooks/useRolesFilters.ts` exactly.
export const useGeoProfilesFilters = () => {
  const [filters, setFilters] = useState<GeoProfilesFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof GeoProfilesFilterState>(key: K, value: GeoProfilesFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
