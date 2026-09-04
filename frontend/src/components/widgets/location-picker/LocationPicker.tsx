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

// Defined once at module scope — a fresh array literal on every render is a
// new reference even though the contents never change, and APIProvider's own
// docs say changing these props after first mount "will in most cases have
// no effect, cause an error, or both," so keeping the reference stable is
// the correct, defensive habit regardless.
const MAP_LIBRARIES: string[] = ['places']

const INDIA_CENTER = { lat: 22.3511148, lng: 78.6677428 }
const DEFAULT_HEIGHT = 320

// Shared fallback for every "the map itself can't render" case — missing
// credentials, and a loaded APIProvider that failed/was rejected by Google.
// Both leave the caller with no other way to produce coordinates, so both
// get the identical manual-entry escape hatch rather than one being a dead
// end. Deliberately latitude/longitude only, not address fields — this
// mirrors exactly what the map itself produces on a bare pin-drop
// (coordinates with no address text), so callers that only read
// `.coordinates` (e.g. Geo Profile) work unchanged, and callers that also
// render LocationAddressFields alongside this still get a place to fill in
// address text separately.
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

  // Keeps the fields in sync when the PARENT replaces `value` from outside
  // (a form reset, loading a different record into the same open picker,
  // etc.) — not just on first mount. "Adjust state during render" (React's
  // own documented alternative to an effect for this exact case) rather than
  // useEffect+setState: comparing against a ref during render and calling
  // setState synchronously here re-renders immediately with the corrected
  // value instead of an effect's extra commit-then-recommit cascade, and
  // this component's own `commit()` calls are what produced the last `value`
  // in the normal typing flow, so the ref already matches and no re-sync fires.
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
    // The API key/Map ID are present but Google rejected them (or the SDK
    // failed to load) — same dead end as the no-credentials case below, so
    // it gets the same manual-entry escape hatch rather than a static
    // message with no way forward.
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

  // No-credentials mode: never mounts APIProvider or calls any Google API
  // when either variable is missing — kept permanently, not just during this
  // pre-Map-ID build window, so CI/other developers' environments never
  // crash on a missing key. Still lets the caller obtain coordinates via
  // manual lat/lng entry, so a Maps-less environment isn't a hard dead end.
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
