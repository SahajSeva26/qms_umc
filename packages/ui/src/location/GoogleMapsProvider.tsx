import type { ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

// Module-scope so the reference stays stable across renders (APIProvider's docs warn that
// changing this prop after mount "will in most cases have no effect, cause an error, or both.").
const MAP_LIBRARIES: string[] = ['places']

interface GoogleMapsProviderProps {
  apiKey: string
  children: ReactNode
}

// Mounted once per app so every Maps consumer shares one loaded SDK instance. Gated on the API
// key alone (not MapId, which only <AdvancedMarker> needs) — ManualCoordinateFallback handles the rest.
const GoogleMapsProvider = ({ apiKey, children }: GoogleMapsProviderProps) => {
  if (!apiKey) return <>{children}</>

  return (
    <APIProvider apiKey={apiKey} libraries={MAP_LIBRARIES}>
      {children}
    </APIProvider>
  )
}

export default GoogleMapsProvider
