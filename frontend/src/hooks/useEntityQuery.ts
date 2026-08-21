import { useQuery, keepPreviousData, type QueryKey } from '@tanstack/react-query'
import type { EntityKeys } from '@/hooks/entityQueryKeys'

interface UseEntityQueryOptions {
  enabled?: boolean
  keepPreviousData?: boolean
}

// Shared "search/list" shape used across every entity: a thin useQuery
// wrapper keyed on [entityKey, query]. The bare-string overload is a
// temporary allowance for callers not yet migrated onto the EntityKeys factory.
export function useEntityQuery<TData, TQuery extends object>(
  entityKey: EntityKeys<TQuery>,
  fetchFn: (query: TQuery) => Promise<TData>,
  query: TQuery,
  options?: UseEntityQueryOptions,
): ReturnType<typeof useQuery<TData>>
export function useEntityQuery<TData, TQuery extends object>(
  entityKey: string,
  fetchFn: (query: TQuery) => Promise<TData>,
  query: TQuery,
  options?: UseEntityQueryOptions,
): ReturnType<typeof useQuery<TData>>
export function useEntityQuery<TData, TQuery extends object>(
  entityKey: string | EntityKeys<TQuery>,
  fetchFn: (query: TQuery) => Promise<TData>,
  query: TQuery,
  options?: UseEntityQueryOptions,
) {
  const queryKey = typeof entityKey === 'string' ? ([entityKey, query] as QueryKey) : entityKey.list(query)

  return useQuery({
    queryKey,
    queryFn: () => fetchFn(query),
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
}
