import { useQuery } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { SearchCampQuery } from '@/types/campReal.types'

export const pharmaMyCampKeys = {
  list: (query: SearchCampQuery) => ['pharma-my-camps', query] as const,
}

// GET /camps/my — the logged-in field-force member's (FO/dietitian/MR) own camps, with a
// top-level status/type summary. Distinct from usePharmaCamps (project-scoped search).
export const usePharmaMyCamps = (query: SearchCampQuery) =>
  useQuery({
    queryKey: pharmaMyCampKeys.list(query),
    queryFn: () => pharmaCampsService.myCamps(query),
  })
