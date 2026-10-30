import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { teamService } from '@/features/team/team.service'
import type { SearchDownlineMrQuery } from '@/features/pharma'

const myTeamKeys = createEntityKeys<SearchDownlineMrQuery>('my-team', 'my-team-mr')

// GET /roles/mrs, server-scoped to the caller's own downline — for ASM, that's exactly their
// direct-report MRs. A plain paginated list (not the typeahead accumulate-on-load-more shape
// useEligibleMrs uses for the booking picker) — My Team shows the whole team at once.
export const useMyTeam = (query: SearchDownlineMrQuery, options?: { enabled?: boolean; keepPreviousData?: boolean }) =>
  useEntityQuery(myTeamKeys, (q) => teamService.searchDownlineMrs(q), query, options)
