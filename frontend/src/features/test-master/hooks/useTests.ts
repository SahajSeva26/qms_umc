import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { testService } from '@/features/test-master/test.service'
import type { SearchTestQuery } from '@/features/test-master/testMaster.types'

export const testKeys = createEntityKeys<SearchTestQuery>('tests', 'test')

// enabled is forwarded (unlike useInventoryMasters, which never needed it) —
// the Project wizard's Basics step disables this query entirely until a
// therapy is chosen, rather than firing it early and hiding the results.
export const useTests = (query: SearchTestQuery, enabled = true) =>
  useEntityQuery(testKeys, (q) => testService.searchTests(q), query, { enabled })
