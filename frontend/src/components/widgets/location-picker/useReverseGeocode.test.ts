import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReverseGeocode } from './useReverseGeocode'

const geocode = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as unknown as { google: unknown }).google = {
    maps: {
      // A real `function` (not an arrow) so `new google.maps.Geocoder()`
      // works — arrow functions aren't constructible.
      Geocoder: vi.fn(function (this: { geocode: typeof geocode }) {
        this.geocode = geocode
      }),
    },
  }
})

function geocoderResult(overrides: Partial<{ place_id: string; address_components: unknown[] }> = {}) {
  return {
    results: [
      {
        place_id: overrides.place_id ?? 'geocoder-place-1',
        address_components: overrides.address_components ?? [
          { long_name: 'Mumbai', short_name: 'Mumbai', types: ['locality'] },
          { long_name: 'Maharashtra', short_name: 'MH', types: ['administrative_area_level_1'] },
        ],
      },
    ],
  }
}

describe('useReverseGeocode', () => {
  it('resolves a dropped pin into a committed LocationValue on success', async () => {
    geocode.mockResolvedValue(geocoderResult())
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 28.6129, lng: 77.2295 })
    })

    expect(onResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Mumbai',
        state: 'Maharashtra',
        googlePlaceId: 'geocoder-place-1',
        coordinates: [77.2295, 28.6129],
      }),
    )
    expect(result.current.status).toBe('idle')
    expect(result.current.provisionalPosition).toBeNull()
  })

  it('shows the provisional pin immediately, before the geocode call resolves', () => {
    let resolveGeocode!: (v: unknown) => void
    geocode.mockReturnValue(new Promise((resolve) => { resolveGeocode = resolve }))
    const { result } = renderHook(() => useReverseGeocode({ onResolved: vi.fn() }))

    act(() => {
      void result.current.runGeocode({ lat: 1, lng: 2 })
    })

    expect(result.current.provisionalPosition).toEqual({ lat: 1, lng: 2 })
    expect(result.current.status).toBe('loading')
    resolveGeocode(geocoderResult())
  })

  it('a superseded (stale) response from an earlier drag never overwrites a later drag\'s result', async () => {
    let resolveFirst!: (v: unknown) => void
    geocode
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => Promise.resolve(geocoderResult({ place_id: 'second-drag' })))

    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    act(() => { void result.current.runGeocode({ lat: 1, lng: 1 }) }) // first drag, slow
    await act(async () => { await result.current.runGeocode({ lat: 2, lng: 2 }) }) // second drag, fast

    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ googlePlaceId: 'second-drag' }))

    // The stale first request resolving after must not fire a second onResolved.
    resolveFirst(geocoderResult({ place_id: 'first-drag-stale' }))
    await new Promise((r) => setTimeout(r, 10))
    expect(onResolved).toHaveBeenCalledTimes(1)
  })

  it('on geocoder failure, retains the provisional pin, sets status to error, and does NOT call onResolved', async () => {
    geocode.mockRejectedValue(new Error('ZERO_RESULTS'))
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.provisionalPosition).toEqual({ lat: 1, lng: 1 })
    expect(onResolved).not.toHaveBeenCalled()
  })

  it('on empty results (no rejection, but zero matches), also sets status to error without calling onResolved', async () => {
    geocode.mockResolvedValue({ results: [] })
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })

    expect(result.current.status).toBe('error')
    expect(onResolved).not.toHaveBeenCalled()
  })

  it('retry() re-runs the geocode call against the same provisional position', async () => {
    geocode.mockRejectedValueOnce(new Error('fail once')).mockResolvedValueOnce(geocoderResult())
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })
    expect(result.current.status).toBe('error')

    await act(async () => {
      result.current.retry()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ coordinates: [1, 1] }))
  })

  it('"Use this pin / enter address manually" commits ONLY the new coordinates, clearing every address-derived field', async () => {
    geocode.mockRejectedValue(new Error('ZERO_RESULTS'))
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved, defaultCountry: 'India' }))

    await act(async () => {
      await result.current.runGeocode({ lat: 5, lng: 6 })
    })
    expect(result.current.status).toBe('error')

    act(() => {
      result.current.useProvisionalPinWithoutAddress()
    })

    expect(onResolved).toHaveBeenCalledWith({
      addressLine1: '',
      addressLine2: undefined,
      locality: undefined,
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      googlePlaceId: undefined,
      coordinates: [6, 5],
    })
    expect(result.current.provisionalPosition).toBeNull()
  })

  it('"Use this pin" falls back to undefined for country when no defaultCountry was given', async () => {
    geocode.mockRejectedValue(new Error('ZERO_RESULTS'))
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })
    act(() => {
      result.current.useProvisionalPinWithoutAddress()
    })

    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ country: undefined }))
  })
})
