import { useQueries } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { CampEntity } from '@/types/campReal.types'

export interface FoWeekCampsEntry {
  camps: CampEntity[]
  isLoading: boolean
  error: unknown
  refetch: () => void
  // True once this FO has more camps in the visible week than the 50-row cap below — the week
  // shown is then a floor, not guaranteed complete. No batch weekly-assignments endpoint exists
  // yet, so this is a one-request-per-visible-FO N+1, same tradeoff as useFoRosterCamps.
  truncated: boolean
}

export function useFoWeekCamps(roleIds: string[], dateFrom: string, dateTo: string): Record<string, FoWeekCampsEntry> {
  const queries = useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: campRealKeys.list({ fo: roleId, dateFrom, dateTo, limit: '50' }),
      queryFn: () => campsRealService.searchCamps({ fo: roleId, dateFrom, dateTo, limit: '50' }),
    })),
  })

  const result: Record<string, FoWeekCampsEntry> = {}
  roleIds.forEach((roleId, i) => {
    const query = queries[i]
    const camps = query.data?.data?.items ?? []
    const count = query.data?.data?.count ?? 0
    result[roleId] = {
      camps,
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => query.refetch(),
      truncated: count > camps.length,
    }
  })
  return result
}
