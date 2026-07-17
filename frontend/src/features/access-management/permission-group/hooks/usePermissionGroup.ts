import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Mirrors `@/features/admin/hooks/useUser.ts` exactly.
export const usePermissionGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: ['permission-group', id],
    queryFn: () => accessManagementService.getPermissionGroup(id as string),
    enabled: !!id,
  })
}
