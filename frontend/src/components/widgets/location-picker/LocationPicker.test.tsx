import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationPicker from './LocationPicker'
import LocationAddressFields from './LocationAddressFields'
import ENV from '@/config/env'
import type { LocationValue } from '@/types/location.types'

// APIProvider throws if mounted with no credentials, so a regression removing
// the no-credentials guard fails loudly here instead of rendering blank.
const { mockLoadingStatus, setMockLoadingStatus } = vi.hoisted(() => {
  let status: string | null = null
  return {
    mockLoadingStatus: () => status,
    setMockLoadingStatus: (next: string | null) => { status = next },
  }
})

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => {
    if (mockLoadingStatus() === null) {
      throw new Error('APIProvider must never mount when credentials are missing')
    }
    return <>{children}</>
  },
  useApiLoadingStatus: () => mockLoadingStatus(),
  APILoadingStatus: { FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE', LOADED: 'LOADED', LOADING: 'LOADING', NONE: 'NONE' },
}))

vi.mock('./LocationSearchBox', () => ({
  default: ({ onSelected }: { onSelected: (v: LocationValue) => void }) => (
    <>
      <button
        type="button"
        onClick={() => onSelected({ addressLine1: '', city: '', state: '', pincode: '', coordinates: [77.209, 28.6139] })}
      >
        Search-select a location
      </button>
      <button
        type="button"
        onClick={() => onSelected({ addressLine1: 'New number', city: 'Pune', state: 'Maharashtra', pincode: '411001', googlePlaceId: 'place-clinic-a', coordinates: [73.86, 18.53] })}
      >
        Search-select a refinement of the same address
      </button>
      <button
        type="button"
        onClick={() => onSelected({ addressLine1: 'Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001', googlePlaceId: 'place-cp', coordinates: [77.21, 28.63] })}
      >
        Search-select a different city
      </button>
      <button
        type="button"
        onClick={() => onSelected({ addressLine1: 'Clinic B', city: 'Pune', state: 'Maharashtra', pincode: '411001', googlePlaceId: 'place-clinic-b', coordinates: [73.87, 18.54] })}
      >
        Search-select a different place in the same postcode
      </button>
    </>
  ),
}))

vi.mock('./MapCanvas', () => ({
  default: ({ onResolutionStateChange, onLocationHintChange }: {
    onResolutionStateChange?: (s: 'idle' | 'loading' | 'error') => void
    onLocationHintChange?: (hint: string | null) => void
  }) => (
    <>
      <button type="button" onClick={() => onResolutionStateChange?.('error')}>
        Simulate map reverse-geocode error
      </button>
      <button type="button" onClick={() => onLocationHintChange?.('Dehene, Maharashtra, India')}>
        Simulate map reverse-geocode hint
      </button>
    </>
  ),
}))

describe('LocationPicker — no-credentials mode', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    // ENV.Maps.* is readonly only at the type level — reassignable at runtime.
    ;(ENV.Maps as { ApiKey: string }).ApiKey = ''
    ;(ENV.Maps as { MapId: string }).MapId = ''
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
  })

  it('renders the "not configured" fallback and never mounts APIProvider when both keys are missing', () => {
    render(<LocationPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/map search is not configured/i)).toBeInTheDocument()
  })

  it('renders the fallback when only the API key is missing (Map ID set)', () => {
    ;(ENV.Maps as { MapId: string }).MapId = 'test-map-id'
    render(<LocationPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/map search is not configured/i)).toBeInTheDocument()
  })

  it('renders the fallback when only the Map ID is missing (API key set) — the real current state of this session', () => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = 'test-api-key'
    render(<LocationPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/map search is not configured/i)).toBeInTheDocument()
  })
})

describe('LocationPicker — disabled prop', () => {
  it('is accepted without crashing while in no-credentials mode (disabled + not-configured together)', () => {
    const originalApiKey = ENV.Maps.ApiKey
    ;(ENV.Maps as { ApiKey: string }).ApiKey = ''
    render(<LocationPicker value={null} onChange={vi.fn()} disabled />)
    expect(screen.getByText(/map search is not configured/i)).toBeInTheDocument()
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
  })
})

describe('LocationPicker — no-credentials fallback, manual coordinate entry', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = ''
    ;(ENV.Maps as { MapId: string }).MapId = ''
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
  })

  it('produces a LocationValue with the correct [lng, lat] tuple once both fields are filled with valid numbers', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '29.2183')
    await user.type(screen.getByLabelText(/^longitude$/i), '79.5130')

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.coordinates).toEqual([79.513, 29.2183])
  })

  it('does not call onChange while only one of the two fields is filled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '29.2183')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows a validation error and does not call onChange for an out-of-range latitude', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '200')
    await user.type(screen.getByLabelText(/^longitude$/i), '79.5130')

    expect(await screen.findByText(/latitude must be a number between -90 and 90/i)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('preserves the rest of the existing LocationValue (e.g. address fields set elsewhere) when only updating coordinates', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const existing: LocationValue = {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra', pincode: '411001',
    }
    render(<LocationPicker value={existing} onChange={onChange} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '29.2183')
    await user.type(screen.getByLabelText(/^longitude$/i), '79.5130')

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.addressLine1).toBe('221 Baker Street')
    expect(lastCall.city).toBe('Pune')
    expect(lastCall.coordinates).toEqual([79.513, 29.2183])
  })

  it('calls onManualCoordinateEntry once valid coordinates are committed, so callers can warn the address may be stale', async () => {
    const onChange = vi.fn()
    const onManualCoordinateEntry = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} onManualCoordinateEntry={onManualCoordinateEntry} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '29.2183')
    expect(onManualCoordinateEntry).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/^longitude$/i), '79.5130')
    expect(onManualCoordinateEntry).toHaveBeenCalled()
  })

  it('pre-fills the fields from an existing value\'s coordinates', () => {
    const existing: LocationValue = {
      addressLine1: '', city: '', state: '', pincode: '',
      coordinates: [79.513, 29.2183],
    }
    render(<LocationPicker value={existing} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/^latitude$/i)).toHaveValue('29.2183')
    expect(screen.getByLabelText(/^longitude$/i)).toHaveValue('79.513')
  })

  it('re-syncs the fields when the parent replaces `value` from outside (e.g. a form reset), not just on first mount', () => {
    const onChange = vi.fn()
    const { rerender } = render(<LocationPicker value={null} onChange={onChange} />)
    expect(screen.getByLabelText(/^latitude$/i)).toHaveValue('')

    const externallySet: LocationValue = {
      addressLine1: '', city: '', state: '', pincode: '',
      coordinates: [79.513, 29.2183],
    }
    rerender(<LocationPicker value={externallySet} onChange={onChange} />)
    expect(screen.getByLabelText(/^latitude$/i)).toHaveValue('29.2183')
    expect(screen.getByLabelText(/^longitude$/i)).toHaveValue('79.513')

    rerender(<LocationPicker value={null} onChange={onChange} />)
    expect(screen.getByLabelText(/^latitude$/i)).toHaveValue('')
    expect(screen.getByLabelText(/^longitude$/i)).toHaveValue('')
  })
})

describe('LocationPicker — map failed to load (credentials present but rejected/unavailable)', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = 'test-api-key'
    ;(ENV.Maps as { MapId: string }).MapId = 'test-map-id'
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
    setMockLoadingStatus(null)
  })

  it('offers manual coordinate entry (not a dead-end message) when the SDK reports FAILED', () => {
    setMockLoadingStatus('FAILED')
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    expect(screen.getByText(/map failed to load/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^latitude$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^longitude$/i)).toBeInTheDocument()
  })

  it('offers manual coordinate entry when the SDK reports AUTH_FAILURE (e.g. a rejected key)', async () => {
    setMockLoadingStatus('AUTH_FAILURE')
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.type(screen.getByLabelText(/^latitude$/i), '29.2183')
    await user.type(screen.getByLabelText(/^longitude$/i), '79.5130')

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.coordinates).toEqual([79.513, 29.2183])
  })
})

describe('LocationPicker — combined resolution state (map + search)', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = 'test-api-key'
    ;(ENV.Maps as { MapId: string }).MapId = 'test-map-id'
    setMockLoadingStatus('LOADED')
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
    setMockLoadingStatus(null)
  })

  it('a successful search selection clears a prior map reverse-geocode error, not leaving Save stuck blocked', async () => {
    const onResolutionStateChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} onResolutionStateChange={onResolutionStateChange} />)

    await user.click(screen.getByRole('button', { name: /simulate map reverse-geocode error/i }))
    expect(onResolutionStateChange).toHaveBeenLastCalledWith('error')

    await user.click(screen.getByRole('button', { name: /search-select a location/i }))
    expect(onResolutionStateChange).toHaveBeenLastCalledWith('idle')
  })

  it('re-selecting the same place (same googlePlaceId) keeps a manually-typed addressLine2/locality, since Google never reliably returns those', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const existing: LocationValue = {
      addressLine1: 'Old address', addressLine2: 'Near the old landmark', locality: 'Old locality',
      city: 'Pune', state: 'Maharashtra', pincode: '411001', googlePlaceId: 'place-clinic-a', coordinates: [73.85, 18.52],
    }
    render(<LocationPicker value={existing} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /search-select a refinement of the same address/i }))

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.addressLine2).toBe('Near the old landmark')
    expect(lastCall.locality).toBe('Old locality')
    expect(lastCall.city).toBe('Pune')
  })

  it('selecting a different place (different city) does NOT carry over the old addressLine2/locality — prevents mixing two addresses', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const existing: LocationValue = {
      addressLine1: 'Old address', addressLine2: 'Near the old landmark', locality: 'Old Pune locality',
      city: 'Pune', state: 'Maharashtra', pincode: '411001', googlePlaceId: 'place-clinic-a', coordinates: [73.85, 18.52],
    }
    render(<LocationPicker value={existing} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /search-select a different city/i }))

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.city).toBe('New Delhi')
    expect(lastCall.addressLine2).toBeUndefined()
    expect(lastCall.locality).toBeUndefined()
  })

  it('selecting a DIFFERENT place with the SAME city/state/pincode (e.g. a neighboring clinic) does NOT carry over the old addressLine2/locality', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const existing: LocationValue = {
      addressLine1: 'Clinic A', addressLine2: 'Near the old landmark', locality: 'Old locality',
      city: 'Pune', state: 'Maharashtra', pincode: '411001', googlePlaceId: 'place-clinic-a', coordinates: [73.85, 18.52],
    }
    render(<LocationPicker value={existing} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /search-select a different place in the same postcode/i }))

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.googlePlaceId).toBe('place-clinic-b')
    expect(lastCall.addressLine2).toBeUndefined()
    expect(lastCall.locality).toBeUndefined()
  })

  it('a googlePlaceId-less prior value (e.g. a manual pin drop) never counts as "the same place" on a subsequent search selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const existing: LocationValue = {
      addressLine1: 'Old address', addressLine2: 'Near the old landmark', locality: 'Old locality',
      city: 'Pune', state: 'Maharashtra', pincode: '411001', coordinates: [73.85, 18.52],
    }
    render(<LocationPicker value={existing} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /search-select a refinement of the same address/i }))

    const lastCall = onChange.mock.calls.at(-1)?.[0] as LocationValue
    expect(lastCall.addressLine2).toBeUndefined()
    expect(lastCall.locality).toBeUndefined()
  })
})

describe('LocationPicker — onLocationHintChange wired into a below-map LocationAddressFields (real call-site shape)', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = 'test-api-key'
    ;(ENV.Maps as { MapId: string }).MapId = 'test-map-id'
    setMockLoadingStatus('LOADED')
  })

  afterEach(() => {
    ;(ENV.Maps as { ApiKey: string }).ApiKey = originalApiKey
    ;(ENV.Maps as { MapId: string }).MapId = originalMapId
    setMockLoadingStatus(null)
  })

  // Mirrors the real pattern every call site uses (CampFormFields.tsx,
  // CreateTenantDialog.tsx, etc.): the caller — not LocationPicker — owns the
  // hint state and threads it into its own sibling LocationAddressFields.
  function LocationWithAddressFields({ value }: { value: LocationValue | null }) {
    const [locationHint, setLocationHint] = useState<string | null>(null)
    return (
      <div>
        <LocationPicker value={value} onChange={vi.fn()} onLocationHintChange={setLocationHint} />
        <LocationAddressFields value={value} onChange={vi.fn()} locationHint={locationHint} />
      </div>
    )
  }

  it('shows the map\'s hint text in the below-map address form once the map reports one, alongside the missing-fields warning', async () => {
    const user = userEvent.setup()
    render(<LocationWithAddressFields value={{ addressLine1: '', city: '', state: '', pincode: '', coordinates: [72.8, 19.07] }} />)

    expect(screen.queryByText(/dehene, maharashtra, india/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate map reverse-geocode hint/i }))

    expect(await screen.findByText(/map location/i)).toBeInTheDocument()
    expect(screen.getByText('Dehene, Maharashtra, India')).toBeInTheDocument()
  })
})
