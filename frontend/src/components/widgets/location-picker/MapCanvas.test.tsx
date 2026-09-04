import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import MapCanvas from './MapCanvas'
import type { LocationValue } from '@/types/location.types'

const geocode = vi.fn()
let capturedMarkerProps: { position?: { lat: number; lng: number }; onDragEnd?: (e: unknown) => void; draggable?: boolean } = {}
let capturedMapOnClick: ((e: unknown) => void) | undefined
let capturedGestureHandling: string | undefined

vi.mock('@vis.gl/react-google-maps', () => ({
  Map: ({ children, onClick, gestureHandling }: { children: React.ReactNode; onClick?: (e: unknown) => void; gestureHandling?: string }) => {
    capturedMapOnClick = onClick
    capturedGestureHandling = gestureHandling
    return <div data-testid="map">{children}</div>
  },
  AdvancedMarker: (props: { position?: { lat: number; lng: number }; onDragEnd?: (e: unknown) => void; draggable?: boolean }) => {
    capturedMarkerProps = props
    return <div data-testid="marker" />
  },
  useMap: () => ({ panTo: vi.fn(), getZoom: () => 5, setZoom: vi.fn() }),
}))

function makeValue(coordinates: [number, number]): LocationValue {
  return {
    addressLine1: '1', city: 'City', state: 'State', country: 'India', pincode: '000000',
    coordinates,
  }
}

function geocoderResult(place_id: string) {
  return {
    results: [{ place_id, address_components: [{ long_name: 'City', short_name: 'City', types: ['locality'] }] }],
  }
}

describe('MapCanvas — marker position after a successful pin-drop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedMarkerProps = {}
    ;(globalThis as unknown as { google: unknown }).google = {
      maps: {
        Geocoder: vi.fn(function (this: { geocode: typeof geocode }) {
          this.geocode = geocode
        }),
      },
    }
  })

  it('shows the pin at the dropped location immediately, while the geocode call is still pending', async () => {
    let resolveGeocode!: (v: unknown) => void
    geocode.mockReturnValue(new Promise((resolve) => { resolveGeocode = resolve }))
    render(<MapCanvas value={null} onChange={vi.fn()} height={300} defaultCenter={{ lat: 0, lng: 0 }} />)

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
    })
    expect(capturedMarkerProps.position).toEqual({ lat: 10, lng: 20 })

    resolveGeocode(geocoderResult('dropped-pin-place'))
  })

  it('a later search selection (a new `value` prop) moves the marker — a resolved pin-drop must not leave the marker stuck at the old position forever', async () => {
    // This is the real regression: MapCanvas computes
    // `pinPosition = provisionalPosition ?? committedPosition`. Before the
    // fix, a SUCCESSFUL pin-drop resolution never cleared
    // provisionalPosition, so it permanently shadowed committedPosition —
    // any later `value` prop change (e.g. from an unrelated search
    // selection) would update the camera/form but the marker would stay
    // stuck at the old dropped-pin position.
    geocode.mockResolvedValue(geocoderResult('dropped-pin-place'))
    const onChange = vi.fn()
    const { rerender } = render(
      <MapCanvas value={null} onChange={onChange} height={300} defaultCenter={{ lat: 0, lng: 0 }} />,
    )

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ coordinates: [20, 10] }))

    // The consuming form applies onChange's result as its new `value` (as a
    // real form would), simulating the resolved pin-drop being committed —
    // then a completely unrelated search selection changes `value` again.
    rerender(
      <MapCanvas value={makeValue([20, 10])} onChange={onChange} height={300} defaultCenter={{ lat: 0, lng: 0 }} />,
    )
    expect(capturedMarkerProps.position).toEqual({ lat: 10, lng: 20 })

    rerender(
      <MapCanvas value={makeValue([50, 60])} onChange={onChange} height={300} defaultCenter={{ lat: 0, lng: 0 }} />,
    )
    expect(capturedMarkerProps.position).toEqual({ lat: 60, lng: 50 })
  })
})

describe('MapCanvas — gesture handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedGestureHandling = undefined
  })

  it('uses cooperative gesture handling when enabled, so page/dialog scroll passes through over the map', () => {
    render(<MapCanvas value={null} onChange={vi.fn()} height={300} defaultCenter={{ lat: 0, lng: 0 }} />)
    expect(capturedGestureHandling).toBe('cooperative')
  })

  it('disables all map gestures when disabled', () => {
    render(<MapCanvas value={null} onChange={vi.fn()} disabled height={300} defaultCenter={{ lat: 0, lng: 0 }} />)
    expect(capturedGestureHandling).toBe('none')
  })
})

describe('MapCanvas — disabled blocks every interaction path, not just gestureHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedMarkerProps = {}
    ;(globalThis as unknown as { google: unknown }).google = {
      maps: {
        Geocoder: vi.fn(function (this: { geocode: typeof geocode }) {
          this.geocode = geocode
        }),
      },
    }
  })

  it('a click on a disabled map does not drop a pin or trigger reverse-geocoding', async () => {
    // handleMapClick's own `if (disabled || !point) return` guard is a
    // SEPARATE code path from gestureHandling — a regression here would let
    // a click still fire runGeocode even while gestureHandling correctly
    // reports 'none'.
    render(<MapCanvas value={null} onChange={vi.fn()} disabled height={300} defaultCenter={{ lat: 0, lng: 0 }} />)

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
    })

    expect(geocode).not.toHaveBeenCalled()
  })

  it('the marker is not draggable when disabled', () => {
    // AdvancedMarker's `draggable={!disabled}` is a THIRD independent code
    // path gated on the same `disabled` prop — untested by the
    // gestureHandling-only checks above.
    render(
      <MapCanvas
        value={{ addressLine1: '1', city: 'City', state: 'State', country: 'India', pincode: '000000', coordinates: [20, 10] }}
        onChange={vi.fn()}
        disabled
        height={300}
        defaultCenter={{ lat: 0, lng: 0 }}
      />,
    )
    expect(capturedMarkerProps.draggable).toBe(false)
  })

  it('the marker IS draggable when not disabled', () => {
    render(
      <MapCanvas
        value={{ addressLine1: '1', city: 'City', state: 'State', country: 'India', pincode: '000000', coordinates: [20, 10] }}
        onChange={vi.fn()}
        height={300}
        defaultCenter={{ lat: 0, lng: 0 }}
      />,
    )
    expect(capturedMarkerProps.draggable).toBe(true)
  })
})
