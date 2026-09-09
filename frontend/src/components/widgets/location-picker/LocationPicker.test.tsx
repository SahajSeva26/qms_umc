import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationPicker from './LocationPicker'
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
    <button
      type="button"
      onClick={() => onSelected({ addressLine1: '', city: '', state: '', pincode: '', coordinates: [77.209, 28.6139] })}
    >
      Search-select a location
    </button>
  ),
}))

vi.mock('./MapCanvas', () => ({
  default: ({ onResolutionStateChange }: { onResolutionStateChange?: (s: 'idle' | 'loading' | 'error') => void }) => (
    <button type="button" onClick={() => onResolutionStateChange?.('error')}>
      Simulate map reverse-geocode error
    </button>
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
})
