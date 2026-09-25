import { APIProvider } from '@vis.gl/react-google-maps'
import ENV from '@/config/env'

// Module-scope so the reference stays stable across renders (APIProvider's docs warn that
// changing this prop after mount "will in most cases have no effect, cause an error, or both.").
const MAP_LIBRARIES: string[] = ['places']

interface GoogleMapsProviderProps {
  children: React.ReactNode
}

// Single app-wide Maps SDK owner, mounted once around the authenticated app shell (AppLayout) so
// every consumer — LocationPicker's map/search, and non-LocationPicker consumers like
// StateCityFilter's Places-only search — shares one loaded SDK instance, instead of each feature
// needing (or forgetting) its own local <APIProvider>.
//
// Gated on the API key alone, not MapId: Places autocomplete needs only the key + 'places' library.
// MapId is required by <AdvancedMarker> specifically (see MapCanvas.tsx, which uses one), not by
// <Map> itself — LocationPicker's own ManualCoordinateFallback still handles a missing MapId.
const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  if (!ENV.Maps.ApiKey) return <>{children}</>

  return (
    <APIProvider apiKey={ENV.Maps.ApiKey} libraries={MAP_LIBRARIES}>
      {children}
    </APIProvider>
  )
}

export default GoogleMapsProvider
