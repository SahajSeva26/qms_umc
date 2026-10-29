import type { AxiosInstance } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { myRatings } from '../rating.service'
import type { SearchRatingQuery } from '../rating.types'

/** GET /ratings/me — the caller's own ratings (about them as worker OR given by them as rater),
 * regardless of permission/role type. For an FO/dietitian's own rating history, or an MR's own
 * past rating submissions. Not yet consumed by either app — the backend route exists and is
 * app-agnostic, kept here so either app can use it without duplicating the call. */
export function useMyRatings(api: AxiosInstance, query: SearchRatingQuery = {}, options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ratings', 'me', query],
    queryFn: () => myRatings(api, query),
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
