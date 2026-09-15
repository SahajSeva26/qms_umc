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

  it('fills pincode from a later result when the first result has none — the rural-gap fallback', async () => {
    geocode.mockResolvedValue({
      results: [
        {
          place_id: 'primary',
          address_components: [{ long_name: 'Dehene', short_name: 'Dehene', types: ['locality'] }],
          formatted_address: 'Dehene, Maharashtra, India',
        },
        { address_components: [{ long_name: '421302', short_name: '421302', types: ['postal_code'] }] },
      ],
    })
    const onResolved = vi.fn()
    const { result } = renderHook(() => useReverseGeocode({ onResolved }))

    await act(async () => {
      await result.current.runGeocode({ lat: 19.2, lng: 73.1 })
    })

    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ pincode: '421302', city: 'Dehene' }))
  })

  it('exposes locationHint from the primary result\'s formatted_address once resolved', async () => {
    geocode.mockResolvedValue(geocoderResult())
    // geocoderResult() has no formatted_address by default — override it here.
    geocode.mockResolvedValueOnce({
      results: [{ place_id: 'p1', address_components: [], formatted_address: 'Somewhere, Maharashtra' }],
    })
    const { result } = renderHook(() => useReverseGeocode({ onResolved: vi.fn() }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })

    expect(result.current.locationHint).toBe('Somewhere, Maharashtra')
  })

  it('clears locationHint back to null on reset()', async () => {
    geocode.mockResolvedValueOnce({
      results: [{ place_id: 'p1', address_components: [], formatted_address: 'Somewhere, Maharashtra' }],
    })
    const { result } = renderHook(() => useReverseGeocode({ onResolved: vi.fn() }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })
    expect(result.current.locationHint).toBe('Somewhere, Maharashtra')

    act(() => { result.current.reset() })
    expect(result.current.locationHint).toBeNull()
  })

  it('clears locationHint on "Use this pin" — a hint about the abandoned reverse-geocode should not linger', async () => {
    geocode.mockResolvedValueOnce({
      results: [{ place_id: 'p1', address_components: [], formatted_address: 'Somewhere, Maharashtra' }],
    })
    const { result } = renderHook(() => useReverseGeocode({ onResolved: vi.fn() }))

    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })
    expect(result.current.locationHint).toBe('Somewhere, Maharashtra')

    geocode.mockRejectedValue(new Error('ZERO_RESULTS'))
    await act(async () => {
      await result.current.runGeocode({ lat: 2, lng: 2 })
    })
    act(() => { result.current.useProvisionalPinWithoutAddress() })
    expect(result.current.locationHint).toBeNull()
  })

  it('a successful lookup for pin A, then a FAILED lookup for a different pin B, leaves locationHint null — never A\'s stale hint shown against B\'s marker', async () => {
    geocode.mockResolvedValueOnce({
      results: [{ place_id: 'pin-a', address_components: [], formatted_address: 'Pin A, Maharashtra' }],
    })
    const { result } = renderHook(() => useReverseGeocode({ onResolved: vi.fn() }))

    // Pin A resolves successfully — hint is set.
    await act(async () => {
      await result.current.runGeocode({ lat: 1, lng: 1 })
    })
    expect(result.current.locationHint).toBe('Pin A, Maharashtra')

    // Pin B's lookup fails outright — no explicit reset/"Use this pin" call,
    // just the new runGeocode itself.
    geocode.mockRejectedValueOnce(new Error('ZERO_RESULTS'))
    await act(async () => {
      await result.current.runGeocode({ lat: 2, lng: 2 })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.locationHint).toBeNull()
  })
})
