import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { pharmaProjectsService } from '@/features/pharma/pharmaProjects.service'
import type { SearchProjectQuery } from '@/types/project.types'

export const pharmaProjectKeys = createEntityKeys<SearchProjectQuery>('pharma-projects', 'pharma-project')

// Backend scopes identically for all 4 pharma role types (division-wide,
// via applyOwnScope) — one hook, no role branching needed here.
export const usePharmaProjects = (query: SearchProjectQuery) =>
  useEntityQuery(pharmaProjectKeys, (q) => pharmaProjectsService.searchScopedProjects(q), query)
