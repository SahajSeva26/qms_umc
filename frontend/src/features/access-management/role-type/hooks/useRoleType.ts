import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Mirrors `@/features/admin/hooks/useUser.ts` / `usePermissionGroup.ts` exactly.
export const useRoleType = (id: string | undefined) => {
  return useQuery({
    queryKey: ['role-type', id],
    queryFn: () => accessManagementService.getRoleType(id as string),
    enabled: !!id,
  })
}
