import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFoRoster } from '@/features/fo/hooks/useFoRoster'
import RosterTab from './RosterTab'
import type { FoRosterEntry } from '@/features/fo/hooks/useFoRoster'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/features/fo/hooks/useFoRoster')

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-1', code: 'fo-001', name: 'Field Officer One', permissions: [], status: 'active',
    type: { name: 'Field Officer', code: 'field-officer' },
    user: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' },
    tenant: { name: 'Qms', code: 'qms' },
    createdAt: '', updatedAt: '', ...overrides,
  } as RoleEntity
}

function geoFixture(overrides: Partial<GeoProfileEntity> = {}): GeoProfileEntity {
  return {
    id: 'geo-1', tenant: 't-1', role: 'role-1', type: 'fo', status: 'active',
    coordinates: [77.0, 28.5], coverageRadius: 35000, meta: {},
    addressLine1: null, addressLine2: null, locality: null, city: 'Gurugram', state: 'Haryana',
    country: 'India', pincode: null, googlePlaceId: null,
    createdAt: '', updatedAt: '', ...overrides,
  } as GeoProfileEntity
}

function mockRoster(overrides: Partial<ReturnType<typeof useFoRoster>> = {}) {
  vi.mocked(useFoRoster).mockReturnValue({
    fos: [], count: 0, isLoading: false, error: null,
    typeResolvedButMissing: false, geoTruncated: false, refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useFoRoster>)
}

describe('RosterTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders real name, contact, status, and location from a fixture', () => {
    const fos: FoRosterEntry[] = [{ role: roleFixture(), geoProfile: geoFixture() }]
    mockRoster({ fos, count: 1 })

    render(<RosterTab />)

    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument()
    expect(screen.getByText('9876543210')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('Gurugram, Haryana')).toBeInTheDocument()
  })

  it('falls back to role.name when the Role\'s user did not populate, without crashing', () => {
    const fos: FoRosterEntry[] = [{ role: roleFixture({ user: 'user-id-string' }), geoProfile: undefined }]
    mockRoster({ fos, count: 1 })

    render(<RosterTab />)

    expect(screen.getByText('Field Officer One')).toBeInTheDocument()
  })

  it('a RoleType-resolution failure renders a distinct error/retry state, not an empty roster', () => {
    mockRoster({ typeResolvedButMissing: true })

    render(<RosterTab />)

    expect(screen.getByText(/couldn't find the field officer role type/i)).toBeInTheDocument()
    expect(screen.queryByText('No field officers found.')).not.toBeInTheDocument()
  })

  it('a generic fetch error also renders a retry state', () => {
    mockRoster({ error: new Error('network') })

    render(<RosterTab />)

    expect(screen.getByText(/failed to load field officers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows the GeoProfile-truncation warning only when geoTruncated is true', () => {
    const fos: FoRosterEntry[] = [{ role: roleFixture(), geoProfile: geoFixture() }]
    mockRoster({ fos, count: 1, geoTruncated: true })

    render(<RosterTab />)

    expect(screen.getByText(/some field officers' locations may not be shown/i)).toBeInTheDocument()
  })

  it('does not show the truncation warning when geoTruncated is false', () => {
    const fos: FoRosterEntry[] = [{ role: roleFixture(), geoProfile: geoFixture() }]
    mockRoster({ fos, count: 1, geoTruncated: false })

    render(<RosterTab />)

    expect(screen.queryByText(/some field officers' locations may not be shown/i)).not.toBeInTheDocument()
  })

  it('renders an empty state when there are genuinely no field officers', () => {
    mockRoster({ fos: [], count: 0 })

    render(<RosterTab />)

    expect(screen.getByText('No field officers found.')).toBeInTheDocument()
  })
})
