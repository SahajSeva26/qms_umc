import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'

// Mirrors `@/features/admin/hooks/useUser.ts` exactly.
export const usePermissionGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: ['permission-group', id],
    queryFn: () => pbacService.getPermissionGroup(id as string),
    enabled: !!id,
  })
}
