import { useQueries } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { CampEntity } from '@/types/campReal.types'

export interface FoRosterCampSummary {
  todayCamp: CampEntity | null
  closedCount: number
  upcomingCount: number
  isLoading: boolean
  // A failed fetch must never read as "0 camps" — callers check this first.
  error: unknown
  refetch: () => void
  // True once this FO's camps exceed the 50-row cap — counts are then a floor.
  truncated: boolean
}

const NOT_CANCELLED = new Set(['cancelled', 'cancelled_charged'])

function summarize(camps: CampEntity[], todayIso: string): Omit<FoRosterCampSummary, 'isLoading' | 'error' | 'refetch' | 'truncated'> {
  const todayCamp = camps.find((c) => c.date?.slice(0, 10) === todayIso) ?? null
  const closedCount = camps.filter((c) => c.status === 'closed').length
  const upcomingCount = camps.filter((c) => c.date?.slice(0, 10) >= todayIso && !NOT_CANCELLED.has(c.status)).length
  return { todayCamp, closedCount, upcomingCount }
}

// One real `GET /camps?fo=<roleId>` per visible roster row (no batch `fo`
// filter exists), each capped at 50 camps — see `truncated` above.
export function useFoRosterCamps(roleIds: string[]): Record<string, FoRosterCampSummary> {
  const todayIso = new Date().toISOString().slice(0, 10)

  const queries = useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: campRealKeys.list({ fo: roleId, limit: '50' }),
      queryFn: () => campsRealService.searchCamps({ fo: roleId, limit: '50' }),
    })),
  })

  const result: Record<string, FoRosterCampSummary> = {}
  roleIds.forEach((roleId, i) => {
    const query = queries[i]
    const camps = query.data?.data?.items ?? []
    const count = query.data?.data?.count ?? 0
    result[roleId] = {
      ...summarize(camps, todayIso),
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => query.refetch(),
      truncated: count > camps.length,
    }
  })
  return result
}
