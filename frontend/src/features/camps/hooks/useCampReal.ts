import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'

export const useCampReal = (id: string | undefined) => {
  return useQuery({
    queryKey: ['campReal', id],
    queryFn: () => campsRealService.getCamp(id as string),
    enabled: !!id,
  })
}
