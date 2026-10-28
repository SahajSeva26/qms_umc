import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { BookCampPayload } from '@/types/campReal.types'

// Invalidates by root key segment ('pharma-my-camps'), not a specific query object — TanStack
// Query matches that as a prefix, covering every status/page variant the Schedule tab has cached.
export const useBookCamp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BookCampPayload) => pharmaCampsService.bookCamp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharma-my-camps'] })
    },
  })
}
