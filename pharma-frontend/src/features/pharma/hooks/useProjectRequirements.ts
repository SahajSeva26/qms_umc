import { useQuery } from '@tanstack/react-query'
import { pharmaProjectsService } from '@/features/pharma/pharmaProjects.service'

// GET /projects/:id/requirements isn't built yet (see md-files/BACKEND_REQUEST_book-camp-requirements.md)
// — 404s until then, surfaced as an ordinary query error. Keyed on projectId alone so a change drops stale in-flight results.
export const useProjectRequirements = (projectId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['project-requirements', projectId],
    queryFn: () => pharmaProjectsService.getProjectRequirements(projectId!),
    enabled: enabled && !!projectId,
  })
