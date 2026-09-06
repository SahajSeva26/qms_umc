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
    render(<MapCanvas value={null} onChange={vi.fn()} disabled height={300} defaultCenter={{ lat: 0, lng: 0 }} />)

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
    })

    expect(geocode).not.toHaveBeenCalled()
  })

  it('the marker is not draggable when disabled', () => {
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

describe('MapCanvas — onResolutionStateChange reports geocode status changes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as unknown as { google: unknown }).google = {
      maps: {
        Geocoder: vi.fn(function (this: { geocode: typeof geocode }) {
          this.geocode = geocode
        }),
      },
    }
  })

  it('reports idle on mount, loading while a geocode is in flight, then idle again on success', async () => {
    let resolveGeocode!: (v: unknown) => void
    geocode.mockReturnValue(new Promise((resolve) => { resolveGeocode = resolve }))
    const onResolutionStateChange = vi.fn()
    render(
      <MapCanvas value={null} onChange={vi.fn()} onResolutionStateChange={onResolutionStateChange} height={300} defaultCenter={{ lat: 0, lng: 0 }} />,
    )
    expect(onResolutionStateChange).toHaveBeenCalledWith('idle')

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
    })
    expect(onResolutionStateChange).toHaveBeenLastCalledWith('loading')

    await act(async () => {
      resolveGeocode(geocoderResult('dropped-pin-place'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onResolutionStateChange).toHaveBeenLastCalledWith('idle')
  })

  it('reports error when reverse-geocoding fails, staying non-idle until retried', async () => {
    geocode.mockRejectedValue(new Error('ZERO_RESULTS'))
    const onResolutionStateChange = vi.fn()
    render(
      <MapCanvas value={null} onChange={vi.fn()} onResolutionStateChange={onResolutionStateChange} height={300} defaultCenter={{ lat: 0, lng: 0 }} />,
    )

    await act(async () => {
      capturedMapOnClick?.({ detail: { latLng: { lat: 10, lng: 20 } } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onResolutionStateChange).toHaveBeenLastCalledWith('error')
  })
})
