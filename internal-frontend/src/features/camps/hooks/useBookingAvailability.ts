import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookingAvailabilityPayload } from '@/types/campReal.types'

// staleTime is short relative to the Inventory reports' 60s — this reflects
// live FO booking state, not a slow-changing aggregate, and is a
// point-in-time snapshot, not a hold on any slot (another booking can land
// between this fetch and the form's own submit).
export const useBookingAvailability = (payload: BookingAvailabilityPayload | null) =>
  useQuery({
    queryKey: ['camps', 'booking-availability', payload],
    queryFn: () => campsRealService.getBookingAvailability(payload!),
    enabled: payload !== null,
    staleTime: 30_000,
  })
