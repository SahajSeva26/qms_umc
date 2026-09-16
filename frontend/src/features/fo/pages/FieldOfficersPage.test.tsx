import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/hooks/usePermission')

const searchRoleTypes = vi.fn(async () => ({ success: true, message: '', data: { count: 1, items: [{ id: 'rt-fo', code: 'field-officer', name: 'Field Officer' }] } }))
const searchRoles = vi.fn(async () => ({
  success: true,
  message: '',
  data: {
    count: 1,
    items: [{
      id: 'role-1',
      code: 'fo-1',
      name: 'FO One',
      status: 'active',
      user: { firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test', phone: '9999999999' },
      tenant: { name: 'Qms', code: 'qms' },
    }],
  },
}))
const searchGeoProfiles = vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } }))

vi.mock('@/features/access-management/role-type/hooks/useRoleTypes', () => ({
  useRoleTypes: () => { searchRoleTypes(); return { data: { data: { items: [{ id: 'rt-fo' }] } }, isLoading: false, error: null, refetch: vi.fn() } },
}))
vi.mock('@/features/access-management/role/hooks/useRoles', () => ({
  useRoles: () => {
    searchRoles()
    return {
      data: { data: { count: 1, items: [{ id: 'role-1', code: 'fo-1', status: 'active', user: { firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test', phone: '9999999999' }, tenant: { name: 'Qms' } }] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
  },
}))
vi.mock('@/features/geo-profile/hooks/useGeoProfiles', () => ({
  useGeoProfiles: () => { searchGeoProfiles(); return { data: { data: { count: 0, items: [] } }, isLoading: false, error: null, refetch: vi.fn() } },
}))

async function renderPage(session: { tenant: { type: 'platform' | 'customer' } } | null) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ session, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
  const FieldOfficersPage = (await import('./FieldOfficersPage')).default
  return render(
    <MemoryRouter initialEntries={['/field-officers']}>
      <Routes>
        <Route path="/field-officers" element={<FieldOfficersPage />} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FieldOfficersPage — platform-tenant gate is a lightweight outer check, not an after-the-fact one', () => {
  it('a platform-tenant session renders the roster and fires the role-type/role/geo-profile queries', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'platform' } })

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(searchRoleTypes).toHaveBeenCalled()
    expect(searchRoles).toHaveBeenCalled()
    expect(searchGeoProfiles).toHaveBeenCalled()
  })

  it('a customer-tenant session is redirected to /unauthorized WITHOUT ever calling the role-type/role/geo-profile hooks', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'customer' } })

    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument()
    expect(searchRoleTypes).not.toHaveBeenCalled()
    expect(searchRoles).not.toHaveBeenCalled()
    expect(searchGeoProfiles).not.toHaveBeenCalled()
  })

  it('a null session (not yet settled) renders the roster content rather than redirecting prematurely', async () => {
    vi.clearAllMocks()
    await renderPage(null)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized page')).not.toBeInTheDocument()
  })
})

describe('FieldOfficersPage — a GeoProfile-only failure does not blank the roster', () => {
  it('shows the roster and a small location-specific retry banner when only the GeoProfile fetch has failed', async () => {
    vi.doMock('@/features/geo-profile/hooks/useGeoProfiles', () => ({
      useGeoProfiles: () => ({ data: undefined, isLoading: false, error: new Error('geo down'), refetch: vi.fn() }),
    }))
    vi.resetModules()

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ session: { tenant: { type: 'platform' } }, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const FieldOfficersPage = (await import('./FieldOfficersPage')).default

    render(
      <MemoryRouter initialEntries={['/field-officers']}>
        <Routes>
          <Route path="/field-officers" element={<FieldOfficersPage />} />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText(/couldn't load field officer locations/i)).toBeInTheDocument()
    expect(screen.queryByText(/failed to load field officers/i)).not.toBeInTheDocument()

    vi.doUnmock('@/features/geo-profile/hooks/useGeoProfiles')
  })
})
