import { useEffect, useRef, useState } from 'react'
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import { Button } from '@/components/ui/button'
import ENV from '@/config/env'
import { useReverseGeocode } from './useReverseGeocode'
import { toLatLngLiteral } from './location.utils'
import type { LocationValue } from '@/types/location.types'

type MapTypeView = 'roadmap' | 'satellite'

const DEFAULT_ZOOM = 5
const SELECTED_ZOOM = 16
const MIN_MEANINGFUL_ZOOM = 10

interface MapCanvasProps {
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  height: number
  defaultCenter: { lat: number; lng: number }
  defaultCountry?: string
}

// Imperatively pans/zooms the map to a genuinely new coordinate (a search
// selection or a successful reverse-geocode) — never a controlled center/zoom
// prop re-asserted on every render, which would fight the user's own pan/zoom.
function CameraFocus({ coordinates }: { coordinates: [number, number] | undefined }) {
  const map = useMap()
  const lastFocusedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!map || !coordinates) return
    const key = coordinates.join(',')
    if (lastFocusedRef.current === key) return
    lastFocusedRef.current = key

    const point = toLatLngLiteral(coordinates)
    map.panTo(point)
    if ((map.getZoom() ?? 0) < MIN_MEANINGFUL_ZOOM) map.setZoom(SELECTED_ZOOM)
  }, [map, coordinates])

  return null
}

const MapCanvas = ({ value, onChange, disabled, height, defaultCenter, defaultCountry }: MapCanvasProps) => {
  const [mapType, setMapType] = useState<MapTypeView>('roadmap')

  const { status: geocodeStatus, provisionalPosition, runGeocode, retry, useProvisionalPinWithoutAddress } =
    useReverseGeocode({ defaultCountry, onResolved: onChange })

  // Left to the React Compiler's own memoization rather than a manual
  // useMemo — a manual dep array here ([value?.coordinates]) is coarser than
  // what the compiler infers, which it flags as unpreservable.
  const committedPosition = value?.coordinates ? toLatLngLiteral(value.coordinates) : null
  const pinPosition = provisionalPosition ?? committedPosition

  const handleMapClick = (point: { lat: number; lng: number } | null) => {
    if (disabled || !point) return
    void runGeocode(point)
  }

  const handleMarkerDragEnd = (point: { lat: number; lng: number } | null) => {
    if (!point) return
    void runGeocode(point)
  }

  return (
    <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: 'var(--qms-border)', height }}>
      <Map
        mapId={ENV.Maps.MapId}
        defaultCenter={pinPosition ?? defaultCenter}
        defaultZoom={pinPosition ? SELECTED_ZOOM : DEFAULT_ZOOM}
        mapTypeId={mapType}
        mapTypeControl={false}
        mapTypeControlOptions={{ mapTypeIds: ['roadmap', 'satellite'] }}
        gestureHandling={disabled ? 'none' : 'cooperative'}
        disableDefaultUI
        clickableIcons={false}
        onClick={(e) => handleMapClick(e.detail.latLng)}
        style={{ width: '100%', height: '100%' }}
      >
        <CameraFocus coordinates={value?.coordinates} />
        {pinPosition && (
          <AdvancedMarker
            position={pinPosition}
            draggable={!disabled}
            onDragEnd={(e) => handleMarkerDragEnd(e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : null)}
          />
        )}
      </Map>

      {/* Own roadmap/satellite toggle — Google's built-in control is hidden (mapTypeControl: false) so this matches the app's own styling. */}
      <div className="absolute top-2 right-2 flex gap-1 p-1 rounded-lg bg-popover shadow-md ring-1 ring-foreground/10">
        {(['roadmap', 'satellite'] as const).map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => setMapType(type)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors disabled:opacity-60"
            style={{
              background: mapType === type ? 'var(--qms-brand)' : 'transparent',
              color: mapType === type ? '#fff' : 'var(--qms-text-soft)',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {geocodeStatus === 'loading' && (
        <div className="absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg text-[12px] bg-popover shadow-md ring-1 ring-foreground/10" style={{ color: 'var(--qms-text-muted)' }}>
          Looking up address…
        </div>
      )}

      {geocodeStatus === 'error' && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[12px] bg-popover shadow-md ring-1 ring-foreground/10 text-danger">
          <span>Couldn't determine an address for this location.</span>
          <div className="flex gap-1.5 shrink-0">
            <Button type="button" size="sm" variant="ghost" onClick={retry}>Retry</Button>
            <Button type="button" size="sm" variant="ghost" onClick={useProvisionalPinWithoutAddress}>Use this pin</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapCanvas
