import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'

// Mirrors `@/features/access-management/role-type/hooks/useRoleType.ts` exactly.
export const useDivision = (id: string | undefined) => {
  return useQuery({
    queryKey: ['division', id],
    queryFn: () => crmService.getDivision(id as string),
    enabled: !!id,
  })
}
