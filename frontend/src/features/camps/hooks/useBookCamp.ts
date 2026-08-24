import { useMutation } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookCampPayload } from '@/types/campReal.types'

// Not useCreateEntity — that invalidates a generic camp-list cache key this
// mutation has no fixed relationship to. The caller here is always
// BookCampForm inside PharmaProjectCampsPage's booking dialog, which already
// knows exactly which scoped camp-list query (usePharmaCamps, keyed by
// project id) needs refetching via its own onBooked callback — a bare
// mutation lets that caller own the refetch precisely, instead of this hook
// guessing at a query key it isn't actually positioned to know.
export const useBookCamp = () => useMutation({
  mutationFn: (payload: BookCampPayload) => campsRealService.bookCamp(payload),
})
