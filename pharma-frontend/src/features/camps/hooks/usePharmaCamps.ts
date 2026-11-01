import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaCampKeys = {
  list: (query: SearchCampQuery) => ['pharma-camps', query] as const,
}

// GET /camps — generic role-scoped search for HO/RSM/ASM/MR. Distinct from usePharmaMyCamps
// (MR/FO/Dietitian-only GET /camps/my). HO (division-head) scoping matches the whole division.
// ASM/RSM scoping matches camps where their own role id is stamped on an assignment field — for a
// normally booked camp (POST /camps/book), that's set correctly at booking time by resolving the
// target MR's real supervisor chain (mr -> asm -> rsm, see resolveMrChain in camp.service.ts), so
// an ASM/RSM genuinely sees their downline's camps. It's a snapshot taken at booking time, not a
// live hierarchy lookup: a camp keeps the manager who was in place when it was booked even after a
// later MR reassignment, and a camp created without an mr in its payload (e.g. a void camp with
// none supplied) never gets asm/rsm populated at all. Neither is a frontend concern to work around.
export const usePharmaCamps = (query: SearchCampQuery, options?: { keepPreviousData?: boolean }) =>
  useQuery({
    queryKey: pharmaCampKeys.list(query),
    queryFn: () => pharmaCampsService.searchScopedCamps(query),
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
