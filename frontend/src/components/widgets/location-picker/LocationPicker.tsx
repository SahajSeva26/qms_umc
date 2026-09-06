import { useId, useRef, useState } from 'react'
import { APIProvider, useApiLoadingStatus, APILoadingStatus } from '@vis.gl/react-google-maps'
import ENV from '@/config/env'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LocationSearchBox from './LocationSearchBox'
import MapCanvas from './MapCanvas'
import type { LocationPickerProps } from './location.types'
import { createEmptyLocationValue, type LocationValue } from '@/types/location.types'

const isValidLatitude = (lat: number) => Number.isFinite(lat) && lat >= -90 && lat <= 90
const isValidLongitude = (lng: number) => Number.isFinite(lng) && lng >= -180 && lng <= 180

// Module-scope so the reference stays stable — APIProvider's docs warn that
// changing this prop after mount "will in most cases have no effect, cause an error, or both."
const MAP_LIBRARIES: string[] = ['places']

const INDIA_CENTER = { lat: 22.3511148, lng: 78.6677428 }
const DEFAULT_HEIGHT = 320

// Shared fallback for missing credentials AND a failed/rejected APIProvider —
// both leave no other way to produce coordinates. Latitude/longitude only
// (no address fields), matching what a bare pin-drop itself produces.
function ManualCoordinateFallback({ height, value, onChange, disabled, defaultCountry, message }: {
  height: number
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  defaultCountry?: string
  message: string
}) {
  const idPrefix = useId()
  const [latitude, setLatitude] = useState(value?.coordinates ? String(value.coordinates[1]) : '')
  const [longitude, setLongitude] = useState(value?.coordinates ? String(value.coordinates[0]) : '')
  const [error, setError] = useState<string | null>(null)

  // Adjusts state during render (React's documented alternative to an effect
  // here) so an external `value` replacement re-syncs immediately, without an
  // effect's extra commit-then-recommit cascade.
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
    onChange({ ...(value ?? createEmptyLocationValue(defaultCountry)), coordinates: [lng, lat] })
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

function LocationPickerInner({ value, onChange, disabled, height = DEFAULT_HEIGHT, defaultCenter, defaultCountry, countryCode, onResolutionStateChange }: LocationPickerProps) {
  const loadingStatus = useApiLoadingStatus()

  if (loadingStatus === APILoadingStatus.FAILED || loadingStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <ManualCoordinateFallback
        height={height}
        value={value}
        onChange={onChange}
        disabled={disabled}
        defaultCountry={defaultCountry}
        message="Map failed to load — check your connection, or enter coordinates manually."
      />
    )
  }

  return (
    <div className="space-y-2">
      <LocationSearchBox disabled={disabled} countryCode={countryCode} defaultCountry={defaultCountry} onSelected={onChange} />
      <MapCanvas
        value={value}
        onChange={onChange}
        disabled={disabled}
        height={height}
        defaultCenter={defaultCenter ?? INDIA_CENTER}
        defaultCountry={defaultCountry}
        onResolutionStateChange={onResolutionStateChange}
      />
    </div>
  )
}

const LocationPicker = (props: LocationPickerProps) => {
  const height = props.height ?? DEFAULT_HEIGHT

  // Never mounts APIProvider when credentials are missing, so a Maps-less
  // environment (CI, a dev with no key) doesn't crash on load.
  if (!ENV.Maps.ApiKey || !ENV.Maps.MapId) {
    return (
      <ManualCoordinateFallback
        height={height}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        defaultCountry={props.defaultCountry}
        message="Map search is not configured in this environment — enter coordinates manually."
      />
    )
  }

  return (
    <APIProvider apiKey={ENV.Maps.ApiKey} libraries={MAP_LIBRARIES}>
      <LocationPickerInner {...props} />
    </APIProvider>
  )
}

export default LocationPicker
