import { useGetEntity } from '@/hooks/useGetEntity'
import { pharmaProjectsService } from '@/features/pharma/pharmaProjects.service'
import { pharmaProjectKeys } from '@/features/pharma/hooks/usePharmaProjects'

// An id outside the caller's own division 404s here — this is the sole
// access gate the camps query and "New camp" button both wait on.
export const usePharmaProject = (id: string | undefined) =>
  useGetEntity(pharmaProjectKeys.detail, pharmaProjectsService.getProject, id)
