import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { testService } from '@/features/test-master/test.service'
import type { SearchTestQuery } from '@/features/test-master/testMaster.types'

export const testKeys = createEntityKeys<SearchTestQuery>('tests', 'test')

export const useTests = (query: SearchTestQuery, enabled = true) =>
  useEntityQuery(testKeys, (q) => testService.searchTests(q), query, { enabled })
