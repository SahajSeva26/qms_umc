import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { ProjectEntity } from '@/types/project.types'

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
//
// FETCHES THE FULL SET, NOT A PAGE. The server defaults `limit` to 10
// (projects.service.ts's DEFAULT_LIMIT, mirroring the backend's own
// RequestHandler.getPagination default). Every consumer of this hook reads
// `projects` as if it were the complete list — none of them page through it
// — so a bare `searchProjects({})` silently truncated the set past the 11th
// record. Dedicated Ops hit this for real: `isDedicated()` matches a local
// overlay against `project.id`, so a Dedicated project sitting outside the
// first page simply vanished from every tab with no error.
//
// The fix asks the SAME endpoint for exactly the total it just learned about
// — not an arbitrary large limit — so it costs nothing extra when everything
// already fits on one page (today's common case) and never over-fetches
// beyond what actually exists.
//
// Query key is 'all' specifically so this doesn't alias with
// useProjects({})'s paginated cache entry (['projects', {}]) — Project
// Management's own list page intentionally shows one page and must keep
// doing so.
async function fetchAllProjects(): Promise<ProjectEntity[]> {
  const first = await projectsService.searchProjects({})
  const { count, items } = first.data
  if (items.length >= count) return items
  const full = await projectsService.searchProjects({ limit: String(count) })
  return full.data.items
}

export const useProjectsDataShared = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: fetchAllProjects,
  })
  return { projects: data ?? [], isLoading, error }
}
