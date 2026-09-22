import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'

vi.mock('@/hooks/usePermission')

function foRole(overrides: Partial<{ typeCode: string; typeName: string }> = {}) {
  return {
    id: 'role-1',
    code: 'fo-1',
    status: 'active',
    type: { code: overrides.typeCode ?? 'field-officer', name: overrides.typeName ?? 'Field Officer' },
    user: { firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test', phone: '9999999999' },
    tenant: { name: 'Qms', code: 'qms' },
  }
}

const getRole = vi.fn(async () => ({ success: true, message: '', data: foRole() }))
const searchGeoProfiles = vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } }))

vi.mock('@/features/access-management/role/hooks/useRole', () => ({
  useRole: () => {
    getRole()
    return { data: { data: foRole() }, isLoading: false, error: null, refetch: vi.fn() }
  },
}))
vi.mock('@/features/geo-profile/hooks/useGeoProfiles', () => ({
  geoProfileKeys: { all: ['geoProfiles'], list: (q: unknown) => ['geoProfiles', q], detail: (id: string) => ['geoProfile', id] },
  useGeoProfiles: (_query: unknown, enabled = true) => {
    if (enabled) searchGeoProfiles()
    return { data: { data: { count: 0, items: [] } }, isLoading: false, error: null, refetch: vi.fn() }
  },
}))

async function renderPage(session: { tenant: { type: 'platform' | 'customer' } } | null) {
  const { usePermission } = await import('@/hooks/usePermission')
  // hasPermission: () => false keeps these gate-focused tests off the
  // LocationForm branch (needs a real QueryClientProvider for its
  // create/update mutations) — read-only location rendering needs no
  // provider, which is all the platform-tenant-gate tests below care about.
  vi.mocked(usePermission).mockReturnValue({ session, hasPermission: () => false, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
  const FieldOfficerDetailPage = (await import('./FieldOfficerDetailPage')).default
  return render(
    <MemoryRouter initialEntries={['/field-officers/role-1']}>
      <Routes>
        <Route path="/field-officers/:id" element={<FieldOfficerDetailPage />} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FieldOfficerDetailPage — platform-tenant gate is a lightweight outer check, not an after-the-fact one', () => {
  it('a platform-tenant session renders the FO and fires the role/geo-profile queries', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'platform' } })

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(getRole).toHaveBeenCalled()
    expect(searchGeoProfiles).toHaveBeenCalled()
  })

  it('a customer-tenant session is redirected to /unauthorized WITHOUT ever calling the role/geo-profile hooks', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'customer' } })

    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument()
    expect(getRole).not.toHaveBeenCalled()
    expect(searchGeoProfiles).not.toHaveBeenCalled()
  })

  it('a null session (not yet settled) renders the FO content rather than redirecting prematurely', async () => {
    vi.clearAllMocks()
    await renderPage(null)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized page')).not.toBeInTheDocument()
  })
})

describe('FieldOfficerDetailPage — rejects a loaded Role that is not actually a field officer', () => {
  it('shows a non-render notice and never fetches GeoProfiles for a non-FO role (e.g. a sales-rep id opened directly)', async () => {
    vi.clearAllMocks()
    vi.doMock('@/features/access-management/role/hooks/useRole', () => ({
      useRole: () => {
        getRole()
        return { data: { data: foRole({ typeCode: 'sales-rep', typeName: 'Sales Representative' }) }, isLoading: false, error: null, refetch: vi.fn() }
      },
    }))
    vi.resetModules()

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ session: { tenant: { type: 'platform' } }, hasPermission: () => true, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const FieldOfficerDetailPage = (await import('./FieldOfficerDetailPage')).default

    render(
      <MemoryRouter initialEntries={['/field-officers/role-1']}>
        <Routes>
          <Route path="/field-officers/:id" element={<FieldOfficerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/not a field officer/i)).toBeInTheDocument()
    expect(screen.queryByText('Jane FO')).not.toBeInTheDocument()
    expect(searchGeoProfiles).not.toHaveBeenCalled()

    vi.doUnmock('@/features/access-management/role/hooks/useRole')
  })

  it('a role.type of null (dangling RoleType ref) is also rejected, not treated as a field officer', async () => {
    vi.clearAllMocks()
    vi.doMock('@/features/access-management/role/hooks/useRole', () => ({
      useRole: () => {
        getRole()
        return { data: { data: { ...foRole(), type: null } }, isLoading: false, error: null, refetch: vi.fn() }
      },
    }))
    vi.resetModules()

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ session: { tenant: { type: 'platform' } }, hasPermission: () => true, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const FieldOfficerDetailPage = (await import('./FieldOfficerDetailPage')).default

    render(
      <MemoryRouter initialEntries={['/field-officers/role-1']}>
        <Routes>
          <Route path="/field-officers/:id" element={<FieldOfficerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/not a field officer/i)).toBeInTheDocument()
    expect(searchGeoProfiles).not.toHaveBeenCalled()

    vi.doUnmock('@/features/access-management/role/hooks/useRole')
  })

  it('never fires the GeoProfile query while the role is still loading, nor after it resolves to non-FO', async () => {
    vi.clearAllMocks()
    // useRole starts genuinely loading (isLoading: true, data: undefined) and
    // only resolves to a non-FO role after a tick — reproduces the real
    // useRole timing this page relies on (Role.type unknown until fetch
    // settles), not the always-already-resolved shape the other mocks use.
    vi.doMock('@/features/access-management/role/hooks/useRole', () => ({
      useRole: () => {
        getRole()
        const [resolved, setResolved] = useState(false)
        useEffect(() => {
          const t = setTimeout(() => setResolved(true), 10)
          return () => clearTimeout(t)
        }, [])
        if (!resolved) {
          return { data: undefined, isLoading: true, error: null, refetch: vi.fn() }
        }
        return { data: { data: foRole({ typeCode: 'sales-rep', typeName: 'Sales Representative' }) }, isLoading: false, error: null, refetch: vi.fn() }
      },
    }))
    vi.resetModules()

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ session: { tenant: { type: 'platform' } }, hasPermission: () => true, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const FieldOfficerDetailPage = (await import('./FieldOfficerDetailPage')).default

    render(
      <MemoryRouter initialEntries={['/field-officers/role-1']}>
        <Routes>
          <Route path="/field-officers/:id" element={<FieldOfficerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // Still loading — the query must not have fired yet.
    expect(screen.getByText(/loading field officer/i)).toBeInTheDocument()
    expect(searchGeoProfiles).not.toHaveBeenCalled()

    // Resolves to non-FO — the query must still never have fired.
    await waitFor(() => expect(screen.getByText(/not a field officer/i)).toBeInTheDocument())
    expect(searchGeoProfiles).not.toHaveBeenCalled()

    vi.doUnmock('@/features/access-management/role/hooks/useRole')
  })
})
