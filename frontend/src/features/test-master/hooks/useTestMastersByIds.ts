import { useQueries } from '@tanstack/react-query'
import { testKeys } from '@/features/test-master/hooks/useTests'
import { testService } from '@/features/test-master/test.service'

// No batch GET /test-masters?ids=... endpoint exists — fetch each entry
// individually in parallel instead.
export const useTestMastersByIds = (ids: string[], enabled: boolean) => {
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: testKeys.detail(id),
      queryFn: () => testService.getTest(id),
      enabled,
    })),
  })

  return {
    items: queries.map((q) => q.data?.data).filter((t) => t !== null && t !== undefined),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  }
}
