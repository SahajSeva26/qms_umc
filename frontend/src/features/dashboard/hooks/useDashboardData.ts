import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/features/dashboard/dashboard.service'
import type { DashboardFilterState } from '@/types/dashboard.types'

/**
 * The dashboard's single data query.
 *
 * Every consumer (the KPI strip + all 7 section cards) calls this with the
 * same `filters` object, so TanStack Query collapses them into ONE fetch and
 * one cache entry. That dedup is deliberate — do not "optimise" it by lifting
 * the data into DashboardPage and prop-drilling it.
 *
 * `filters` is part of the key because the data source is expected to scope
 * the payload by it. Values are compared structurally (TanStack hashes the key
 * by value, not identity), so a re-rendered filter object does not refetch.
 */
export const useDashboardData = (filters: DashboardFilterState) => {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboardData(filters),
  })
}
