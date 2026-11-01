import { useCallback, useRef, useState } from 'react'
import type { LocationValue } from '@qms/core'
import { fromGeocoderAddressComponentsWithFallback, toCoordinatesTuple } from './location.utils'

export type ReverseGeocodeStatus = 'idle' | 'loading' | 'error'

interface UseReverseGeocodeOptions {
  defaultCountry?: string
  onResolved: (value: LocationValue) => void
}

// A monotonic request id (not AbortController — not fetch-backed) guards against a stale drag's response winning.
export function useReverseGeocode({ defaultCountry, onResolved }: UseReverseGeocodeOptions) {
  const [status, setStatus] = useState<ReverseGeocodeStatus>('idle')
  const [provisionalPosition, setProvisionalPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const latestRequestId = useRef(0)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const runGeocode = useCallback(
    async (point: { lat: number; lng: number }) => {
      const requestId = ++latestRequestId.current
      setProvisionalPosition(point)
      // A prior pin's hint must never survive onto a new, possibly-failed lookup.
      setLocationHint(null)
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

        // Scans every result for a postal_code, not just the primary — see location.utils.ts.
        const { address: addressFields, locationHint: hint } = fromGeocoderAddressComponentsWithFallback(
          response.results,
          result.place_id,
          defaultCountry,
        )
        setStatus('idle')
        setLocationHint(hint)
        onResolved({ ...addressFields, coordinates: toCoordinatesTuple(point) })
        // Cleared on success so MapCanvas falls through to the freshly-committed position.
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

  // Invalidates any in-flight request (e.g. an earlier drag) so it can't overwrite a location committed elsewhere.
  const reset = useCallback(() => {
    latestRequestId.current += 1
    setStatus('idle')
    setProvisionalPosition(null)
    setLocationHint(null)
  }, [])

  // Clears every address-derived field, not just the required ones — the old
  // addressLine2/locality/googlePlaceId must not ride along with new coordinates.
  const useProvisionalPinWithoutAddress = useCallback(() => {
    if (!provisionalPosition) return
    setStatus('idle')
    setLocationHint(null)
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

  return { status, provisionalPosition, locationHint, runGeocode, retry, useProvisionalPinWithoutAddress, reset }
}
