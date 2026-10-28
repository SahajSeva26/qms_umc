import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/types/camp.types'
import { fetchDietitianProfile } from '@/features/diet/services/dietitianProfile.service'
import { dietKeys } from './dietQueryKeys'

// Assembled dietitian profile. Replaces DietitianProfilesPage's
// `refreshTick`/`bump()` pair and its eslint-disabled useMemo.
//
// The bundle joins the dietitian stores with camp records, so the key carries
// the camps cache's `dataUpdatedAt` — when a camp changes, the camps query
// updates, this component re-renders, the key changes and the bundle
// recomputes. Reading the timestamp off the query client (rather than adding
// a return value to the shared useCampsData hook) keeps this contained to the
// Diet feature and adds no extra query.
export const useDietitianProfile = (dietitianId: string | null | undefined, camps: Camp[]) => {
  const queryClient = useQueryClient()
  const campsRev = queryClient.getQueryState(['camps'])?.dataUpdatedAt ?? 0

  return useQuery({
    queryKey: dietKeys.profile(dietitianId ?? '', campsRev),
    queryFn: () => fetchDietitianProfile(dietitianId as string, camps),
    enabled: !!dietitianId,
    // campsRev is part of the key, so ANY camp write mints a new key. Without
    // this the whole profile would drop back to a pending/blank state on every
    // camp mutation; keeping the previous bundle means the page re-renders in
    // place. The genuine first load still reports pending, which is what the
    // page's loading state is for.
    placeholderData: (previous) => previous,
  })
}
