import { useQuery } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'

// staleTime avoids refetching this rate-limited aggregate on every remount —
// useMoveProjectStage/useUpdateProject's ['projects'] invalidation still covers it.
export const useProjectReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'report'],
    queryFn: () => projectsService.getProjectReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
