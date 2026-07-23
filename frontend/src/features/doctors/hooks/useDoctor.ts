import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'

// Mirrors `@/features/access-management/role/hooks/useRole.ts` exactly.
export const useDoctor = (id: string | undefined) => {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorsService.getDoctor(id as string),
    enabled: !!id,
  })
}
