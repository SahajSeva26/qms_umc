import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campFilesKeys } from '@/features/camps/hooks/useCampFiles'
import type { CampFileRelation } from '@/types/campReal.types'

export const useDiscardCampFile = (campId: string, relation: CampFileRelation) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileId: string) => campsRealService.discardCampFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campFilesKeys.list(campId, relation) })
    },
  })
}
