import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { EntityKeys } from '@/hooks/entityQueryKeys'

interface UseEntityQueryOptions {
  enabled?: boolean
  keepPreviousData?: boolean
  retry?: boolean
}

// Shared "search/list" shape used across every entity. Mirrors internal-frontend's
// useEntityQuery.ts.
export function useEntityQuery<TData, TQuery extends object>(
  entityKey: EntityKeys<TQuery>,
  fetchFn: (query: TQuery) => Promise<TData>,
  query: TQuery,
  options?: UseEntityQueryOptions,
) {
  return useQuery({
    queryKey: entityKey.list(query),
    queryFn: () => fetchFn(query),
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  })
}
