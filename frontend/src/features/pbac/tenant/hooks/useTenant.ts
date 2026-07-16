import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'

// Mirrors `@/features/admin/hooks/useUser.ts` exactly.
export const useTenant = (id: string | undefined) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => pbacService.getTenant(id as string),
    enabled: !!id,
  })
}
