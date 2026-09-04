import { useCallback, useRef, useState } from 'react'
import { fromGeocoderAddressComponents, toCoordinatesTuple } from './location.utils'
import type { LocationValue } from '@/types/location.types'

export type ReverseGeocodeStatus = 'idle' | 'loading' | 'error'

interface UseReverseGeocodeOptions {
  defaultCountry?: string
  onResolved: (value: LocationValue) => void
}

/**
 * Coordinates -> address, via the (legacy-named but current) Geocoding API's
 * `Geocoder.geocode()` — genuinely different API from Places Autocomplete,
 * which has no "given coordinates, give me an address" operation.
 *
 * Guards against a real race: dragging the pin twice in quick succession can
 * let the FIRST drag's response resolve after the SECOND drag's, which must
 * never win. A monotonically-increasing request id (not an AbortController —
 * these calls aren't fetch-backed in a way AbortController can cancel) is
 * the guard; a superseded response is discarded silently.
 */
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
        // Cleared on success so MapCanvas's `provisionalPosition ?? committedPosition`
        // falls through to the freshly-committed `value.coordinates` — otherwise a
        // later search selection updates the camera/form but the marker stays
        // pinned to this now-stale drag/click position forever.
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

  /**
   * "Use this pin / enter address manually" — commits ONLY the new
   * coordinates, clearing every address-derived field (not just the
   * required ones): the previous addressLine2/locality/googlePlaceId
   * belonged to the OLD location and must not silently ride along attached
   * to the NEW coordinates. country falls back to defaultCountry, since
   * that's the one field with a sensible non-empty default to keep.
   */
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
