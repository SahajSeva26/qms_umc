import { useEntityQuery } from '@/hooks/useEntityQuery'
import { projectKeys } from '@/hooks/projectKeys'
import { projectsService } from '@/features/projects/projects.service'
import type { SearchProjectQuery } from '@/types/project.types'

// `enabled` defaults to true; pass false to opt out (e.g. a caller that
// never calls projectName() and shouldn't fire this query at all).
export const useProjects = (query: SearchProjectQuery = {}, enabled = true) =>
  useEntityQuery(projectKeys, (q) => projectsService.searchProjects(q), query, { enabled })
