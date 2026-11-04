import type { AxiosInstance } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { searchRatings } from '../rating.service'
import type { SearchRatingQuery } from '../rating.types'

// Same ['ratings', query] cache-key shape used across both apps — a single list query per
// distinct filter set (by camp, by worker, etc).
export function useRatings(api: AxiosInstance, query: SearchRatingQuery, options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ratings', query],
    queryFn: () => searchRatings(api, query),
    enabled: options?.enabled ?? true,
  })

  return {
    items: data?.data?.items ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    refetch,
  }
}
