import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LocationPicker from './LocationPicker'
import ENV from '@/config/env'

// LocationPicker's own no-credentials check must short-circuit BEFORE ever
// touching @vis.gl/react-google-maps — mock it anyway so a regression that
// removes the guard fails loudly (an unmocked APIProvider would throw
// immediately without a real API key) rather than silently rendering blank.
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: () => {
    throw new Error('APIProvider must never mount when credentials are missing')
  },
}))

describe('LocationPicker — no-credentials mode', () => {
  const originalApiKey = ENV.Maps.ApiKey
  const originalMapId = ENV.Maps.MapId

  beforeEach(() => {
    // ENV.Maps.* is a readonly-typed `as const` object at the type level
    // only — reassigning at runtime for this test, restored after each.
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
