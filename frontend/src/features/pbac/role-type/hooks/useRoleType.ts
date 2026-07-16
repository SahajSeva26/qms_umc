import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'

// Mirrors `@/features/admin/hooks/useUser.ts` / `usePermissionGroup.ts` exactly.
export const useRoleType = (id: string | undefined) => {
  return useQuery({
    queryKey: ['role-type', id],
    queryFn: () => pbacService.getRoleType(id as string),
    enabled: !!id,
  })
}
