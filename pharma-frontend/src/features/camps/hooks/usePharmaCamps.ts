import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaCampKeys = {
  list: (query: SearchCampQuery) => ['pharma-camps', query] as const,
}

// GET /camps — generic role-scoped search for HO/RSM/ASM's dashboard. Distinct from
// usePharmaMyCamps (MR/FO/Dietitian-only GET /camps/my).
// TODO(backend): confirmed via direct code read that the backend's own-scope query for ASM/RSM
// does NOT yet resolve a real downline (direct/indirect reports) — it only matches a camp where
// the ASM/RSM's own role id happens to be stamped onto it at booking time, so this hook can return
// an incomplete/inconsistent camp list for those roles today. HO (division-head) scoping is
// correct. See md-files/BACKEND_REQUEST_camp-asm-rsm-own-scope.md (the scoping fix) and
// md-files/BACKEND_REQUEST_camp-scope-indexes.md (indexes needed once that fix lands).
export const usePharmaCamps = (query: SearchCampQuery, options?: { keepPreviousData?: boolean }) =>
  useQuery({
    queryKey: pharmaCampKeys.list(query),
    queryFn: () => pharmaCampsService.searchScopedCamps(query),
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
