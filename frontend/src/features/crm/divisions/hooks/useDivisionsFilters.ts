import { useState } from 'react'
import type { DivisionStatus, DivisionTherapy } from '@/types/crm.types'

// Default status is 'active', not an 'ALL' sentinel — division.service.ts's
// search() always force-sets `where.status = ACTIVE` before it even looks at
// whether a status filter was sent, and only overrides that for a caller
// holding `division:manage`/`tenant:manage` (see DivisionsListPage.tsx's own
// permission-gated Status dropdown). There is no way to request "every
// status in one call" the way this used to be faked client-side with two
// parallel active+inactive queries — matches the fix already applied to
// Users' own status filter for the identical reason.
export type DivisionsSearchBy = 'name' | 'code'

export interface DivisionsFilterState {
  search: string
  code: string
  // Which field the single search box currently searches by — 'search'
  // (name) or 'code' both stay as separate state so switching the dropdown
  // never loses what was typed under the other mode, but only the active
  // one is ever sent to useDivisions (see DivisionsListPage.tsx).
  searchBy: DivisionsSearchBy
  status: DivisionStatus
  therapy: DivisionTherapy | 'ALL'
}

const DEFAULT_FILTERS: DivisionsFilterState = {
  search: '',
  code: '',
  searchBy: 'name',
  status: 'active',
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
