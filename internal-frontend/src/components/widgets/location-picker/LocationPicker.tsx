import { useContext, useEffect, useId, useRef, useState } from 'react'
import { useApiLoadingStatus, APILoadingStatus, APIProviderContext } from '@vis.gl/react-google-maps'
import ENV from '@/config/env'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LocationSearchBox from './LocationSearchBox'
import MapCanvas from './MapCanvas'
import type { LocationPickerProps, LocationResolutionState } from './location.types'
import { createEmptyLocationValue, type LocationValue } from '@/types/location.types'

const isValidLatitude = (lat: number) => Number.isFinite(lat) && lat >= -90 && lat <= 90
const isValidLongitude = (lng: number) => Number.isFinite(lng) && lng >= -180 && lng <= 180

// Mumbai — used as the map's default center whenever no caller supplies its
// own defaultCenter (confirmed: no current feature passes one).
const DEFAULT_CENTER = { lat: 19.0759837, lng: 72.8776559 }
const DEFAULT_HEIGHT = 320

// Shared fallback for missing credentials AND a failed/rejected APIProvider — both leave no other way to produce coordinates.
// Latitude/longitude only (no address fields), matching what a bare pin-drop itself produces.
function ManualCoordinateFallback({ height, value, onChange, disabled, defaultCountry, message, onManualCoordinateEntry }: {
  height: number
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  defaultCountry?: string
  message: string
  onManualCoordinateEntry?: () => void
}) {
  const idPrefix = useId()
  const [latitude, setLatitude] = useState(value?.coordinates ? String(value.coordinates[1]) : '')
  const [longitude, setLongitude] = useState(value?.coordinates ? String(value.coordinates[0]) : '')
  const [error, setError] = useState<string | null>(null)

  // Adjusts state during render (React's documented alternative to an effect) so an external
  // `value` replacement re-syncs immediately, without an effect's extra commit-then-recommit cascade.
  const lastSyncedCoordinates = useRef(value?.coordinates)
  if (lastSyncedCoordinates.current !== value?.coordinates) {
    lastSyncedCoordinates.current = value?.coordinates
    const nextLatitude = value?.coordinates ? String(value.coordinates[1]) : ''
    const nextLongitude = value?.coordinates ? String(value.coordinates[0]) : ''
    if (nextLatitude !== latitude) setLatitude(nextLatitude)
    if (nextLongitude !== longitude) setLongitude(nextLongitude)
  }

  const commit = (nextLat: string, nextLng: string) => {
    const lat = Number(nextLat)
    const lng = Number(nextLng)
    if (nextLat.trim() === '' || nextLng.trim() === '') { setError(null); return }
    if (!isValidLatitude(lat)) { setError('Latitude must be a number between -90 and 90'); return }
    if (!isValidLongitude(lng)) { setError('Longitude must be a number between -180 and 180'); return }
    setError(null)
    // Preserves any existing address — manual entry has no geocoder to replace it with,
    // so the caller (via onManualCoordinateEntry) decides whether that's a problem.
    onChange({ ...(value ?? createEmptyLocationValue(defaultCountry)), coordinates: [lng, lat] })
    onManualCoordinateEntry?.()
  }

  return (
    <div
      className="rounded-lg border p-3 space-y-3"
      style={{ minHeight: height, borderColor: 'var(--qms-border)' }}
    >
      <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        {message}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-lat`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Latitude</Label>
          <Input
            id={`${idPrefix}-lat`}
            type="text"
            inputMode="decimal"
            value={latitude}
            disabled={disabled}
            placeholder="e.g. 29.2183"
            onChange={(e) => { setLatitude(e.target.value); commit(e.target.value, longitude) }}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-lng`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Longitude</Label>
          <Input
            id={`${idPrefix}-lng`}
            type="text"
            inputMode="decimal"
            value={longitude}
            disabled={disabled}
            placeholder="e.g. 79.5130"
            onChange={(e) => { setLongitude(e.target.value); commit(latitude, e.target.value) }}
          />
        </div>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}

function LocationPickerInner({ value, onChange, disabled, height = DEFAULT_HEIGHT, defaultCenter, defaultCountry, countryCode, onResolutionStateChange, onManualCoordinateEntry, onLocationHintChange }: LocationPickerProps) {
  const loadingStatus = useApiLoadingStatus()
  // Distinguishes "no APIProvider ancestor at all" (GoogleMapsProvider didn't mount — no API key
  // configured) from a real, momentarily-NOT_LOADED provider that's about to start loading.
  const hasProviderContext = useContext(APIProviderContext) !== null
  // A search selection is a real network round trip too — while it's in flight,
  // `value` isn't final yet, same hazard as the map's own reverse-geocode 'loading'.
  const [isSelecting, setIsSelecting] = useState(false)
  const [mapResolution, setMapResolution] = useState<LocationResolutionState>('idle')
  const [mapResetToken, setMapResetToken] = useState(0)

  useEffect(() => {
    onResolutionStateChange?.(isSelecting ? 'loading' : mapResolution)
  }, [isSelecting, mapResolution, onResolutionStateChange])

  if (!hasProviderContext || loadingStatus === APILoadingStatus.FAILED || loadingStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <ManualCoordinateFallback
        height={height}
        value={value}
        onChange={onChange}
        disabled={disabled}
        defaultCountry={defaultCountry}
        message="Map failed to load — check your connection, or enter coordinates manually."
        onManualCoordinateEntry={onManualCoordinateEntry}
      />
    )
  }

  const handleSearchSelected = (selected: LocationValue) => {
    // Cancels any in-flight/stale reverse-geocode and clears a stuck 'error' state so a late response can't overwrite this selection.
    setMapResolution('idle')
    setMapResetToken((t) => t + 1)
    // The map's own hint (from a now-superseded pin drop) no longer applies.
    onLocationHintChange?.(null)
    // Same Google Place ID = the same place re-selected (Google omits addressLine2/locality) — carry those over. Any other place, including a same-postcode neighbor, must not inherit them.
    const isSamePlace = !!value?.googlePlaceId && value.googlePlaceId === selected.googlePlaceId
    onChange({
      ...selected,
      addressLine2: selected.addressLine2 ?? (isSamePlace ? value?.addressLine2 : undefined),
      locality: selected.locality ?? (isSamePlace ? value?.locality : undefined),
    })
  }

  return (
    <div className="space-y-2">
      <LocationSearchBox
        disabled={disabled}
        countryCode={countryCode}
        defaultCountry={defaultCountry}
        onSelected={handleSearchSelected}
        onSelectingStateChange={setIsSelecting}
      />
      <MapCanvas
        value={value}
        onChange={onChange}
        disabled={disabled}
        height={height}
        defaultCenter={defaultCenter ?? DEFAULT_CENTER}
        defaultCountry={defaultCountry}
        onResolutionStateChange={setMapResolution}
        onLocationHintChange={onLocationHintChange}
        resetToken={mapResetToken}
      />
    </div>
  )
}

const LocationPicker = (props: LocationPickerProps) => {
  const height = props.height ?? DEFAULT_HEIGHT

  // MapCanvas renders an <AdvancedMarker>, which requires a MapId (Map itself doesn't) — the
  // shared GoogleMapsProvider (mounted at AppLayout) only guarantees the API key + Places library.
  if (!ENV.Maps.ApiKey || !ENV.Maps.MapId) {
    return (
      <ManualCoordinateFallback
        height={height}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        defaultCountry={props.defaultCountry}
        message="Map search is not configured in this environment — enter coordinates manually."
        onManualCoordinateEntry={props.onManualCoordinateEntry}
      />
    )
  }

  return <LocationPickerInner {...props} />
}

export default LocationPicker
