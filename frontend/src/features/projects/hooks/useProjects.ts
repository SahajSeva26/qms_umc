import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { projectsService } from '@/features/projects/projects.service'
import type { SearchProjectQuery } from '@/features/projects/project.types'

export const projectKeys = createEntityKeys<SearchProjectQuery>('projects', 'project')

// `enabled` defaults to true; pass false to opt out (e.g. a caller that
// never calls projectName() and shouldn't fire this query at all).
export const useProjects = (query: SearchProjectQuery = {}, enabled = true) =>
  useEntityQuery(projectKeys, (q) => projectsService.searchProjects(q), query, { enabled })
