import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaMyCampKeys = {
  list: (query: SearchCampQuery) => ['pharma-my-camps', query] as const,
}

// GET /camps/my — the logged-in field-force member's (FO/dietitian/MR) own camps, with a
// top-level status/type summary. Distinct from usePharmaCamps (project-scoped search).
export const usePharmaMyCamps = (query: SearchCampQuery, options?: { keepPreviousData?: boolean }) =>
  useQuery({
    queryKey: pharmaMyCampKeys.list(query),
    queryFn: () => pharmaCampsService.myCamps(query),
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
