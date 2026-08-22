import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { EntityKeys } from '@/hooks/entityQueryKeys'

interface UseEntityQueryOptions {
  enabled?: boolean
  keepPreviousData?: boolean
}

// Shared "search/list" shape used across every entity: a thin useQuery
// wrapper keyed on [entityKey, query].
export function useEntityQuery<TData, TQuery extends object>(
  entityKey: EntityKeys<TQuery>,
  fetchFn: (query: TQuery) => Promise<TData>,
  query: TQuery,
  options?: UseEntityQueryOptions,
) {
  const queryKey = entityKey.list(query)

  return useQuery({
    queryKey,
    queryFn: () => fetchFn(query),
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
}
