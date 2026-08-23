import { useMutation } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookCampPayload } from '@/types/campReal.types'

// Not useCreateEntity — that invalidates the camp-list cache on success, but
// pharma roles have no camp:search/camp:get and never hold a camp-list query
// to begin with, so there's nothing useful to invalidate.
export const useBookCamp = () => useMutation({
  mutationFn: (payload: BookCampPayload) => campsRealService.bookCamp(payload),
})
