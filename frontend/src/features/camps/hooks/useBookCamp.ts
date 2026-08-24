import { useMutation } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookCampPayload } from '@/types/campReal.types'

// Not useCreateEntity — this mutation has no fixed cache key to invalidate.
// The caller (BookCampForm) already knows exactly which scoped camp-list query to refetch via onBooked.
export const useBookCamp = () => useMutation({
  mutationFn: (payload: BookCampPayload) => campsRealService.bookCamp(payload),
})
