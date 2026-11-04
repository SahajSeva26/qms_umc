import { useQuery } from '@tanstack/react-query'
import { searchRatings, type RatingEntity } from '@qms/core'
import api from '@/lib/api/api'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'
import { useSession } from '@/hooks/useSession'

const PAGE_SIZE = 50

function mean(items: RatingEntity[], select: (rating: RatingEntity) => number): number | null {
  if (items.length === 0) return null
  return Math.round((items.reduce((sum, rating) => sum + select(rating), 0) / items.length) * 10) / 10
}

async function loadCompleteOwnRatings(worker: string): Promise<{ items: RatingEntity[]; count: number }> {
  // The backend exposes paginated rows with a server-derived `overall`, not an aggregate — fetch
  // every page so the average is never a first-page sample.
  const first = await searchRatings(api, { worker, page: '1', limit: String(PAGE_SIZE) })
  const count = first.data.count
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const remaining = await fetchRemainingPagesBounded(totalPages, (page) =>
    searchRatings(api, { worker, page: String(page), limit: String(PAGE_SIZE) }),
  )
  return { count, items: [first, ...remaining].flatMap((response) => response.data.items) }
}

// The logged-in FO's own rating summary — self-scoped single-worker variant of
// features/fo's roster multi-worker fan-out.
export function useMyRating() {
  const { session } = useSession()
  const worker = session?.role.id
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-rating', worker],
    queryFn: () => loadCompleteOwnRatings(worker!),
    enabled: !!worker,
  })

  return {
    average: data ? mean(data.items, (r) => r.overall) : null,
    onTimeAverage: data ? mean(data.items, (r) => r.onTime) : null,
    attireAverage: data ? mean(data.items, (r) => r.attire) : null,
    communicationAverage: data ? mean(data.items, (r) => r.communication) : null,
    count: data?.count ?? 0,
    isLoading,
    error,
    refetch,
  }
}
