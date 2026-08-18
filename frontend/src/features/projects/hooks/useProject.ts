import { useGetEntity } from '@/hooks/useGetEntity'
import { projectsService } from '@/features/projects/projects.service'
import { projectKeys } from '@/features/projects/hooks/useProjects'

// Single-record fetch for the detail drawer/edit modal — always populated
// (project.controller.ts's get() always requests {populate:true}).
export const useProject = (id: string | undefined) => useGetEntity(projectKeys.detail, projectsService.getProject, id)
