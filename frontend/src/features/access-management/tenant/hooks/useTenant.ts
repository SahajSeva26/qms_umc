import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Mirrors `@/features/admin/hooks/useUser.ts` exactly.
export const useTenant = (id: string | undefined) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => accessManagementService.getTenant(id as string),
    enabled: !!id,
  })
}
