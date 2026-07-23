import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'

// Single-record fetch for the detail drawer/edit modal — always populated
// (project.controller.ts's get() always requests {populate:true}).
export const useProject = (id: string | undefined) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsService.getProject(id as string),
    enabled: !!id,
  })
}
