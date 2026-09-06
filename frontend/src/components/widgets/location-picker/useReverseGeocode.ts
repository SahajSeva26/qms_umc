import { useCallback, useRef, useState } from 'react'
import { fromGeocoderAddressComponents, toCoordinatesTuple } from './location.utils'
import type { LocationValue } from '@/types/location.types'

export type ReverseGeocodeStatus = 'idle' | 'loading' | 'error'

interface UseReverseGeocodeOptions {
  defaultCountry?: string
  onResolved: (value: LocationValue) => void
}

// A monotonically-increasing request id (not AbortController — these calls
// aren't fetch-backed) guards against a stale drag's response winning over a later one.
export function useReverseGeocode({ defaultCountry, onResolved }: UseReverseGeocodeOptions) {
  const [status, setStatus] = useState<ReverseGeocodeStatus>('idle')
  const [provisionalPosition, setProvisionalPosition] = useState<{ lat: number; lng: number } | null>(null)
  const latestRequestId = useRef(0)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const runGeocode = useCallback(
    async (point: { lat: number; lng: number }) => {
      const requestId = ++latestRequestId.current
      setProvisionalPosition(point)
      setStatus('loading')

      if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder()

      try {
        const response = await geocoderRef.current.geocode({ location: point })
        if (requestId !== latestRequestId.current) return // superseded by a newer drag/click

        const result = response.results[0]
        if (!result) {
          setStatus('error')
          return
        }

        const addressFields = fromGeocoderAddressComponents(result.address_components, result.place_id, defaultCountry)
        setStatus('idle')
        onResolved({ ...addressFields, coordinates: toCoordinatesTuple(point) })
        // Cleared on success so MapCanvas falls through to the freshly-committed
        // position instead of staying pinned to this now-stale one.
        setProvisionalPosition(null)
      } catch {
        if (requestId !== latestRequestId.current) return
        setStatus('error')
      }
    },
    [defaultCountry, onResolved],
  )

  const retry = useCallback(() => {
    if (provisionalPosition) void runGeocode(provisionalPosition)
  }, [provisionalPosition, runGeocode])

  // Clears every address-derived field, not just the required ones — the old
  // addressLine2/locality/googlePlaceId must not ride along with new coordinates.
  const useProvisionalPinWithoutAddress = useCallback(() => {
    if (!provisionalPosition) return
    setStatus('idle')
    onResolved({
      addressLine1: '',
      addressLine2: undefined,
      locality: undefined,
      city: '',
      state: '',
      country: defaultCountry?.trim() || undefined,
      pincode: '',
      googlePlaceId: undefined,
      coordinates: toCoordinatesTuple(provisionalPosition),
    })
    setProvisionalPosition(null)
  }, [provisionalPosition, defaultCountry, onResolved])

  return { status, provisionalPosition, runGeocode, retry, useProvisionalPinWithoutAddress }
}
