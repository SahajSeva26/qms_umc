import { useQuery } from '@tanstack/react-query'
import { ratingService } from '@/features/rating/rating.service'
import type { SearchRatingQuery } from '@/types/rating.types'

/** GET /ratings/me — the caller's own ratings (about them as worker OR given by them as rater),
 * regardless of permission/role type. For an FO/dietitian's own rating history, or an MR's own
 * past rating submissions. */
export const useMyRatings = (query: SearchRatingQuery = {}, options?: { enabled?: boolean }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ratings', 'me', query],
    queryFn: () => ratingService.myRatings(query),
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
