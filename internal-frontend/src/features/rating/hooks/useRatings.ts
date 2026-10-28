import { useQuery } from '@tanstack/react-query'
import { ratingService } from '@/features/rating/rating.service'
import type { SearchRatingQuery } from '@/types/rating.types'

// Same ['ratings', query] cache-key shape as useQaFeedback.ts — a single list query per
// distinct filter set (by camp, by worker, etc).
export const useRatings = (query: SearchRatingQuery, options?: { enabled?: boolean }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ratings', query],
    queryFn: () => ratingService.searchRatings(query),
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
