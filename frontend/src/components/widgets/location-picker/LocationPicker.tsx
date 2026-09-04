import { APIProvider, useApiLoadingStatus, APILoadingStatus } from '@vis.gl/react-google-maps'
import ENV from '@/config/env'
import LocationSearchBox from './LocationSearchBox'
import MapCanvas from './MapCanvas'
import type { LocationPickerProps } from './location.types'

// Defined once at module scope — a fresh array literal on every render is a
// new reference even though the contents never change, and APIProvider's own
// docs say changing these props after first mount "will in most cases have
// no effect, cause an error, or both," so keeping the reference stable is
// the correct, defensive habit regardless.
const MAP_LIBRARIES: string[] = ['places']

const INDIA_CENTER = { lat: 22.3511148, lng: 78.6677428 }
const DEFAULT_HEIGHT = 320

function NotConfiguredFallback({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border text-[12px] text-center px-4"
      style={{ height, borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
    >
      Map search is not configured in this environment.
    </div>
  )
}

function LoadFailedFallback({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border text-[12px] text-center px-4 text-danger"
      style={{ height, borderColor: 'var(--qms-border)' }}
    >
      Map failed to load — check your connection and retry.
    </div>
  )
}

function LocationPickerInner({ value, onChange, disabled, height = DEFAULT_HEIGHT, defaultCenter, defaultCountry, countryCode }: LocationPickerProps) {
  const loadingStatus = useApiLoadingStatus()

  if (loadingStatus === APILoadingStatus.FAILED || loadingStatus === APILoadingStatus.AUTH_FAILURE) {
    return <LoadFailedFallback height={height} />
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
      />
    </div>
  )
}

const LocationPicker = (props: LocationPickerProps) => {
  const height = props.height ?? DEFAULT_HEIGHT

  // No-credentials mode: never mounts APIProvider or calls any Google API
  // when either variable is missing — kept permanently, not just during this
  // pre-Map-ID build window, so CI/other developers' environments never
  // crash on a missing key.
  if (!ENV.Maps.ApiKey || !ENV.Maps.MapId) {
    return <NotConfiguredFallback height={height} />
  }

  return (
    <APIProvider apiKey={ENV.Maps.ApiKey} libraries={MAP_LIBRARIES}>
      <LocationPickerInner {...props} />
    </APIProvider>
  )
}

export default LocationPicker
