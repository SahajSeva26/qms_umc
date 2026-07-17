import { useQuery } from '@tanstack/react-query'
import * as projectsService from '@/features/projects/projects.service'

// Read-only shared wrapper around Project Management's data — lets other
// features (Dedicated Ops, Camps' Project filter) read projects without
// importing features/projects/ internals directly. Mirrors useCampsData.ts's
// role as the sanctioned shared surface over features/camps/. Mutations
// (create/renew/close/etc.) stay in features/projects/hooks/useProjects.ts —
// only Project Management itself acts on a project's own lifecycle.
export const useProjectsDataShared = () => {
  const { data: projects = [], isLoading, error } = useQuery({ queryKey: ['projects'], queryFn: projectsService.getProjects })
  return { projects, isLoading, error }
}
