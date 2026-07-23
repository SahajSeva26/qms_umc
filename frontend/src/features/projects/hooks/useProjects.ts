import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { SearchProjectQuery } from '@/types/project.types'

// Thin useQuery wrapper keyed on the raw search query, mirroring useRoles.ts/
// useTenants.ts exactly — any filter change auto-refetches via the query key.
export const useProjects = (query: SearchProjectQuery = {}) => {
  return useQuery({
    queryKey: ['projects', query],
    queryFn: () => projectsService.searchProjects(query),
  })
}
