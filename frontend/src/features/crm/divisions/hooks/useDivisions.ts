import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { divisionService } from '@/features/crm/divisions/division.service'
import type { SearchDivisionQuery } from '@/features/crm/crm.types'

export const divisionKeys = createEntityKeys<SearchDivisionQuery>('divisions', 'division')

// `enabled` defaults to true; pass false while a caller has nothing to filter
// by yet, so this doesn't fire an unscoped, all-tenants call no one asked for.
export const useDivisions = (query: SearchDivisionQuery, enabled = true) =>
  useEntityQuery(divisionKeys, (q) => divisionService.searchDivisions(q), query, { enabled })
