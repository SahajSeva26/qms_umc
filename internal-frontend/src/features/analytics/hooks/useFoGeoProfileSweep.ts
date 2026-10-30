import { useQuery } from '@tanstack/react-query'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import { fetchRemainingPagesBounded } from '@/lib/api/pagination'

const STALE_TIME_MS = 60_000
const PAGE_SIZE = 200

// /geo-profiles has no permission gate of its own, but is gated the same as the camp sweep
// (camp:manage, see useFoAnalyticsAccess.ts) so it can't imply org-wide coverage alone.
async function fetchAllFoGeoProfiles(): Promise<GeoProfileEntity[]> {
  const firstPage = await geoProfileService.searchGeoProfiles({ type: 'fo', limit: String(PAGE_SIZE), page: '1' })
  const { count, items } = firstPage.data

  const totalPages = Math.ceil(count / PAGE_SIZE)
  if (totalPages <= 1) return items

  const restPages = await fetchRemainingPagesBounded(totalPages, (page) =>
    geoProfileService.searchGeoProfiles({ type: 'fo', limit: String(PAGE_SIZE), page: String(page) }),
  )
  return [items, ...restPages.map((p) => p.data.items)].flat()
}

export const useFoGeoProfileSweep = (enabled: boolean) =>
  useQuery({
    queryKey: ['geo-profiles', 'fo-analytics-sweep'],
    queryFn: fetchAllFoGeoProfiles,
    enabled,
    staleTime: STALE_TIME_MS,
  })
