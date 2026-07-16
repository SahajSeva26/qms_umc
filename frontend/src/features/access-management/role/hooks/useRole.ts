import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Mirrors `@/features/access-management/role-type/hooks/useRoleType.ts` exactly.
export const useRole = (id: string | undefined) => {
  return useQuery({
    queryKey: ['role', id],
    queryFn: () => accessManagementService.getRole(id as string),
    enabled: !!id,
  })
}
