import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { divisionService } from '@/features/crm/divisions/division.service'
import type { SearchDivisionQuery } from '@/types/crm.types'

// Shared, read-only divisions query — lets other features list divisions without depending on CRM's own hook.
const divisionKeys = createEntityKeys<SearchDivisionQuery>('divisions', 'division')

export const useDivisionsShared = (query: SearchDivisionQuery, enabled = true) =>
  useEntityQuery(divisionKeys, (q) => divisionService.searchDivisions(q), query, { enabled })
