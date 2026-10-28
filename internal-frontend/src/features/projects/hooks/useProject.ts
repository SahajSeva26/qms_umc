import { useGetEntity } from '@/hooks/useGetEntity'
import { projectKeys } from '@/hooks/projectKeys'
import { projectsService } from '@/features/projects/projects.service'

export const useProject = (id: string | undefined) => useGetEntity(projectKeys.detail, projectsService.getProject, id)
