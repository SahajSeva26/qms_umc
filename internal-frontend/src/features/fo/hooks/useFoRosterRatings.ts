import { useQueries } from '@tanstack/react-query'
import { searchRatings, type RatingEntity } from '@qms/core'
import api from '@/lib/api/api'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'

const PAGE_SIZE = 50

export interface FoRosterRatingSummary {
  average: number | null
  onTimeAverage: number | null
  attireAverage: number | null
  communicationAverage: number | null
  count: number
  isLoading: boolean
  error: unknown
  refetch: () => void
}

async function loadCompleteWorkerRatings(worker: string): Promise<{ items: RatingEntity[]; count: number }> {
  // The backend exposes paginated rating rows with a server-derived `overall`, not an aggregate.
  // Fetch every page so the roster never presents a first-page/sample average as the FO's rating.
  const first = await searchRatings(api, { worker, page: '1', limit: String(PAGE_SIZE) })
  const count = first.data.count
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const remaining = await fetchRemainingPagesBounded(totalPages, (page) =>
    searchRatings(api, { worker, page: String(page), limit: String(PAGE_SIZE) }),
  )

  return {
    count,
    items: [first, ...remaining].flatMap((response) => response.data.items),
  }
}

function mean(items: RatingEntity[], select: (rating: RatingEntity) => number): number | null {
  if (items.length === 0) return null
  return Math.round((items.reduce((sum, rating) => sum + select(rating), 0) / items.length) * 10) / 10
}

// One initial ratings request per visible roster row. Additional pages are fetched only when an FO
// has more than PAGE_SIZE ratings; remaining requests use the shared bounded-concurrency helper.
export function useFoRosterRatings(
  roleIds: string[],
  enabled: boolean,
): Record<string, FoRosterRatingSummary> {
  const queries = useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: ['fo-roster-rating', roleId],
      queryFn: () => loadCompleteWorkerRatings(roleId),
      enabled,
    })),
  })

  const result: Record<string, FoRosterRatingSummary> = {}
  if (!enabled) return result

  roleIds.forEach((roleId, index) => {
    const query = queries[index]
    result[roleId] = {
      average: query.data ? mean(query.data.items, (rating) => rating.overall) : null,
      onTimeAverage: query.data ? mean(query.data.items, (rating) => rating.onTime) : null,
      attireAverage: query.data ? mean(query.data.items, (rating) => rating.attire) : null,
      communicationAverage: query.data ? mean(query.data.items, (rating) => rating.communication) : null,
      count: query.data?.count ?? 0,
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => { void query.refetch() },
    }
  })

  return result
}
