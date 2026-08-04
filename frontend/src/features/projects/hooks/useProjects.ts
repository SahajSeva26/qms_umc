import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { SearchProjectQuery } from '@/types/project.types'

// Thin useQuery wrapper keyed on the raw search query, mirroring useRoles.ts/
// useTenants.ts exactly — any filter change auto-refetches via the query key.
// `enabled` defaults to true for existing unscoped callers (ProjectsPage.tsx/
// ProjectGanttPage.tsx never gated this) — added for useCampRefNames.ts's
// per-resource opt-in fallback fetches, so a caller that never uses
// projectName() doesn't fire this query at all.
export const useProjects = (query: SearchProjectQuery = {}, enabled = true) => {
  return useQuery({
    queryKey: ['projects', query],
    queryFn: () => projectsService.searchProjects(query),
    enabled,
  })
}
