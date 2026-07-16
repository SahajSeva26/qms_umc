import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'

// Mirrors `@/features/pbac/role-type/hooks/useRoleType.ts` exactly.
export const useRole = (id: string | undefined) => {
  return useQuery({
    queryKey: ['role', id],
    queryFn: () => pbacService.getRole(id as string),
    enabled: !!id,
  })
}
