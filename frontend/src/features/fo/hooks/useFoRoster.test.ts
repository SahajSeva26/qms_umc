import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useFoRoster } from './useFoRoster'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/features/access-management/role/hooks/useRoles')
vi.mock('@/features/access-management/role-type/hooks/useRoleTypes')
vi.mock('@/features/geo-profile/hooks/useGeoProfiles')

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

function mockRoleTypes(items: { id: string; code: string }[], overrides: Partial<ReturnType<typeof useRoleTypes>> = {}) {
  vi.mocked(useRoleTypes).mockReturnValue({
    data: { success: true, message: '', data: { items, count: items.length } },
    isLoading: false, error: null, refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useRoleTypes>)
}

function mockRoles(items: RoleEntity[], count = items.length, overrides: Partial<ReturnType<typeof useRoles>> = {}) {
  vi.mocked(useRoles).mockReturnValue({
    data: { success: true, message: '', data: { items, count } },
    isLoading: false, error: null, refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useRoles>)
}

function mockGeoProfiles(items: GeoProfileEntity[], count = items.length, overrides: Partial<ReturnType<typeof useGeoProfiles>> = {}) {
  vi.mocked(useGeoProfiles).mockReturnValue({
    data: { success: true, message: '', data: { items, count } },
    isLoading: false, error: null, refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useGeoProfiles>)
}

describe('useFoRoster', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves the field-officer RoleType then lists Roles of that type, joined to their GeoProfile', () => {
    mockRoleTypes([{ id: 'rt-fo', code: 'field-officer' }])
    mockRoles([roleFixture()])
    mockGeoProfiles([geoFixture()])

    const { result } = renderHook(() => useFoRoster())

    expect(useRoles).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rt-fo', status: 'active' }),
      true,
    )
    expect(result.current.fos).toHaveLength(1)
    expect(result.current.fos[0].role.id).toBe('role-1')
    expect(result.current.fos[0].geoProfile?.city).toBe('Gurugram')
  })

  it('a Role with no matching GeoProfile yields geoProfile: undefined, not a crash', () => {
    mockRoleTypes([{ id: 'rt-fo', code: 'field-officer' }])
    mockRoles([roleFixture({ id: 'role-2' })])
    mockGeoProfiles([]) // no geo profiles at all

    const { result } = renderHook(() => useFoRoster())

    expect(result.current.fos).toHaveLength(1)
    expect(result.current.fos[0].geoProfile).toBeUndefined()
  })

  it('passes page/limit through to the Roles query', () => {
    mockRoleTypes([{ id: 'rt-fo', code: 'field-officer' }])
    mockRoles([])
    mockGeoProfiles([])

    renderHook(() => useFoRoster({ page: '3', limit: '20' }))

    expect(useRoles).toHaveBeenCalledWith(
      expect.objectContaining({ page: '3', limit: '20' }),
      true,
    )
  })

  it('typeResolvedButMissing is false while the RoleType query is still loading', () => {
    mockRoleTypes([], { isLoading: true })
    mockRoles([])
    mockGeoProfiles([])

    const { result } = renderHook(() => useFoRoster())

    expect(result.current.typeResolvedButMissing).toBe(false)
    expect(result.current.isLoading).toBe(true)
  })

  it('typeResolvedButMissing is true only once the RoleType query has genuinely resolved to zero results', () => {
    mockRoleTypes([], { isLoading: false })
    mockRoles([])
    mockGeoProfiles([])

    const { result } = renderHook(() => useFoRoster())

    expect(result.current.typeResolvedButMissing).toBe(true)
  })

  it('geoTruncated is true only when the real GeoProfile count exceeds the fetched page', () => {
    mockRoleTypes([{ id: 'rt-fo', code: 'field-officer' }])
    mockRoles([roleFixture()])
    mockGeoProfiles([geoFixture()], 250) // fetched 1 of a real 250

    const { result } = renderHook(() => useFoRoster())

    expect(result.current.geoTruncated).toBe(true)
  })

  it('geoTruncated is false when the fetched page covers the full real count', () => {
    mockRoleTypes([{ id: 'rt-fo', code: 'field-officer' }])
    mockRoles([roleFixture()])
    mockGeoProfiles([geoFixture()], 1)

    const { result } = renderHook(() => useFoRoster())

    expect(result.current.geoTruncated).toBe(false)
  })
})
