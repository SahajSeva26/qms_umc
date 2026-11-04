import { useQuery, type QueryKey } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampFileRelation } from '@/types/campReal.types'

// Read-only — this app has no upload/activate/discard hooks, since those are FO/dietitian-only
// server-side. staleTime:0 — a background refetch must never serve a stale presigned read url.
export const campFilesKeys = {
  list: (campId: string, relation: CampFileRelation): QueryKey => ['camps', 'files', campId, relation],
}

export function useCampFiles(campId: string, relation: CampFileRelation, enabled = true) {
  const query = useQuery({
    queryKey: campFilesKeys.list(campId, relation),
    queryFn: () => pharmaCampsService.getCampFiles({ entityId: campId, relation }),
    enabled: enabled && !!campId,
    staleTime: 0,
  })

  return {
    files: query.data?.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => { void query.refetch() },
  }
}
