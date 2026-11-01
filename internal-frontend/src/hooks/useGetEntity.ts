import { useQuery, type QueryKey } from '@tanstack/react-query'

// Keyed on [entityKey, id], enabled only once an id exists. The `queryFn`
// guard also protects a caller-invoked `refetch()`, which runs regardless of `enabled`.
export function useGetEntity<TData>(
  keyFor: (id: string) => QueryKey,
  fetchFn: (id: string) => Promise<TData>,
  id: string | undefined,
) {
  return useQuery({
    queryKey: keyFor(id ?? ''),
    queryFn: () => {
      if (!id) return Promise.reject(new Error('useGetEntity: refetch() called with no id'))
      return fetchFn(id)
    },
    enabled: !!id,
  })
}
