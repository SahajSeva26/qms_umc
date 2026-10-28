import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaCampKeys = {
  list: (query: SearchCampQuery) => ['pharma-camps', query] as const,
}

// GET /camps — generic role-scoped search for HO/RSM/ASM's dashboard. Distinct from
// usePharmaMyCamps (MR/FO/Dietitian-only GET /camps/my).
export const usePharmaCamps = (query: SearchCampQuery, options?: { keepPreviousData?: boolean }) =>
  useQuery({
    queryKey: pharmaCampKeys.list(query),
    queryFn: () => pharmaCampsService.searchScopedCamps(query),
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
