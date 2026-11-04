import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import EditDoctorModal from './EditDoctorModal'
import ENV from '@/config/env'

// Real integration test for the P2 finding: LocationPicker needs a mounted GoogleMapsProvider
// ancestor (an API key passed as a prop to LocationPicker itself does NOT initialize the SDK —
// only <APIProvider> does that). Every other test touching this modal (PharmaDoctorsTab.test.tsx,
// MrPortalPage.test.tsx) replaces the WHOLE modal with `() => null`, so none of them would ever
// catch a missing provider. This file renders the real EditDoctorModal, with Maps "configured"
// (non-empty ApiKey/MapId), and proves the real <APIProvider> actually mounts underneath it.
//
// APIProvider throws if mounted with no credentials — reused here as the proof mechanism: if
// GoogleMapsProvider is missing or misconfigured, APIProvider either never mounts (so the throw
// never fires, and the picker falls back to "not configured") or — if this guard is ever
// removed/broken — throws loudly instead of silently rendering the no-credentials fallback.
const { mockLoadingStatus } = vi.hoisted(() => {
  const status: string | null = 'LOADED'
  return { mockLoadingStatus: () => status }
})

// Built lazily inside the mock factory (which runs at import time, unlike vi.mock's own hoisted
// call) since createContext needs the real React module.
vi.mock('@vis.gl/react-google-maps', async () => {
  const { createContext } = await import('react')
  const MockAPIProviderContext = createContext<{ status: string } | null>(null)
  return {
    // The real proof mechanism: APIProvider throws if mounted with no credentials. If
    // GoogleMapsProvider is missing from the component tree, apiKey here is '' and this throws —
    // the same guard internal-frontend's original LocationPicker.test.tsx used before the
    // location-picker extraction.
    APIProvider: ({ children, apiKey }: { children: React.ReactNode; apiKey: string }) => {
      if (!apiKey) throw new Error('APIProvider must never mount when credentials are missing')
      return (
        <MockAPIProviderContext.Provider value={{ status: mockLoadingStatus() }}>
          {children}
        </MockAPIProviderContext.Provider>
      )
    },
    APIProviderContext: MockAPIProviderContext,
    useApiLoadingStatus: () => mockLoadingStatus(),
    APILoadingStatus: { NOT_LOADED: 'NOT_LOADED', FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE', LOADED: 'LOADED', LOADING: 'LOADING', NONE: 'NONE' },
    // Null = "library not ready yet", which LocationSearchBox/usePlacesAutocomplete already
    // handle gracefully (shows "Loading search…") — this test only needs to prove the real
    // APIProvider/context chain connects, not exercise a live Places search.
    useMapsLibrary: () => null,
    // The real <Map>/<AdvancedMarker>/useMap need an actual `google` global (the real Maps JS
    // SDK, loaded by a real APIProvider in production) — out of scope here; MapCanvas.test.tsx
    // already covers the map canvas itself. This test only needs to prove the provider CHAIN
    // connects (GoogleMapsProvider → APIProvider → context), which happens before either
    // component renders.
    Map: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
    AdvancedMarker: () => null,
    useMap: () => ({ panTo: vi.fn(), getZoom: () => 5, setZoom: vi.fn() }),
  }
})

vi.mock('@/features/pharma/hooks/useCreateDoctor', () => ({ useCreateDoctor: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/features/pharma/hooks/useUpdateDoctor', () => ({ useUpdateDoctor: () => ({ mutateAsync: vi.fn(), isPending: false }) }))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderModal() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <EditDoctorModal open doctor={null} divisionId="div-1" onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('EditDoctorModal — GoogleMapsProvider is actually mounted (real integration, not a mocked LocationPicker)', () => {
  let originalApiKey: string
  let originalMapId: string

  beforeEach(() => {
    originalApiKey = ENV.Maps.ApiKey
    originalMapId = ENV.Maps.MapId
    // ENV.Maps.* is readonly only at the type level — reassignable at runtime, same technique
    // the old (pre-extraction) LocationPicker.test.tsx used in internal-frontend.
    ;(ENV.Maps as { ApiKey: string }).ApiKey = 'test-maps-api-key'
    ;(ENV.Maps as { MapId: string }).MapId = 'test-map-id'
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
  })

  it('renders the real map UI (search box), not the "not configured" fallback, when Maps credentials are set', async () => {
    renderModal()

    expect(await screen.findByRole('heading', { name: 'Add doctor' })).toBeInTheDocument()
    // LocationSearchBox's real search input — only reachable once GoogleMapsProvider has
    // actually mounted a working APIProvider ancestor for LocationPicker to read from.
    expect(screen.getByPlaceholderText(/search for a location/i)).toBeInTheDocument()
    expect(screen.queryByText(/map search is not configured/i)).not.toBeInTheDocument()
  })

  it('does NOT throw (confirming APIProvider mounts) when Maps credentials are present', () => {
    expect(() => renderModal()).not.toThrow()
  })
})
