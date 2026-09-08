import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { testResultService } from '@/features/clinical/test-result/testResult.service'
import type { SearchTestResultQuery } from '@/features/clinical/test-result/testResult.types'

export const testResultKeys = createEntityKeys<SearchTestResultQuery>('test-results', 'test-result')

export const useTestResults = (query: SearchTestResultQuery, enabled = true) =>
  useEntityQuery(testResultKeys, (q) => testResultService.searchTestResults(q), query, { enabled })
