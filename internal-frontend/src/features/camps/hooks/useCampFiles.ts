import { useQuery, type QueryKey } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { CampFileRelation } from '@/types/campReal.types'

// Lists a camp's active files for one relation (setup/check-in-selfie/closure), with presigned
// read urls. staleTime:0 — a background refetch after an upload must never serve a stale read url.
export const campFilesKeys = {
  list: (campId: string, relation: CampFileRelation): QueryKey => ['camps', 'files', campId, relation],
}

export function useCampFiles(campId: string, relation: CampFileRelation, enabled = true) {
  const query = useQuery({
    queryKey: campFilesKeys.list(campId, relation),
    queryFn: () => campsRealService.getCampFiles({ entityId: campId, relation }),
    enabled: enabled && !!campId,
    staleTime: 0,
  })

  return {
    files: query.data?.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    // throwOnError — a bare refetch() resolves (not rejects) on failure, so without this a caller
    // awaiting it (e.g. post-activation) would see success and never learn the refresh failed.
    refetch: () => query.refetch({ throwOnError: true }),
  }
}
