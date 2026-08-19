import { useCreateEntity } from '@/hooks/useCreateEntity'
import { projectsService } from '@/features/projects/projects.service'
import { projectKeys } from '@/features/projects/hooks/useProjects'
import type { CreateProjectPayload } from '@/types/project.types'

// Consumer calls mutateAsync and awaits it (per EditLeadModal's consumption
// convention), only closing the wizard on real success.
export const useCreateProject = () => useCreateEntity((payload: CreateProjectPayload) => projectsService.createProject(payload), projectKeys.all)
