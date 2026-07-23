import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'

// Read-only shared wrapper around Project Management's data — lets other
// features (Dedicated Ops, Camps' Project filter, FO Config, OM/ERP) read
// projects without importing features/projects/ internals directly. Mirrors
// useCampsData.ts's role as the sanctioned shared surface over
// features/camps/. Mutations (create/update/moveStage) stay in
// features/projects/hooks/ — only Project Management itself acts on a
// project's own lifecycle.
//
// Now backed by the real GET /projects search endpoint (previously a mock
// module-level array) — returns ProjectEntity[], always populated
// (tenant/division/lead/salesRep/projectCoordinator/marketingContact), same
// shape Project Management's own list page consumes.
export const useProjectsDataShared = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', {}],
    queryFn: () => projectsService.searchProjects({}),
  })
  const projects = data?.data?.items ?? []
  return { projects, isLoading, error }
}
