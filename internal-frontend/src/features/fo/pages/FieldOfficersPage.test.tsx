import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
// CreateFoModal renders in this tree once tenantId/foTypeId both resolve —
// stub its own mutation dependency so this file stays a pure page-wiring test.
vi.mock('@/features/access-management/role/hooks/useCreateRole', () => ({
  useCreateRole: () => ({ mutate: vi.fn(), isPending: false, isError: false, isSuccess: false, error: null, reset: vi.fn() }),
}))
// These hit real GET /camps, /inventory-assignments, /employees — stubbed so
// this file stays a pure page-wiring test.
vi.mock('@/features/fo/hooks/useFoRosterCamps', () => ({
  useFoRosterCamps: () => ({}),
}))
vi.mock('@/features/fo/hooks/useFoRosterDevices', () => ({
  useFoRosterDevices: () => ({}),
}))
vi.mock('@/features/fo/hooks/useFoWeekCamps', () => ({
  useFoWeekCamps: () => ({}),
}))
vi.mock('@/features/fo/hooks/useFoTodayCamps', () => ({
  useFoTodayCamps: () => ({ camps: [], totalCount: 0, liveCamps: [], unassignedCamps: [], truncated: false, isLoading: false, error: null, refetch: vi.fn() }),
  useFoActiveCount: () => ({ totalActive: 1, idleCount: 1, roleTruncated: false, isLoading: false }),
}))
// FoRealDrawer independently fetches useRole/useGeoProfiles/useFoEmployee/etc.
// — stubbed to a no-op so opening it in a test never fires real network hooks.
vi.mock('@/features/fo/components/FoRealDrawer', () => ({
  default: ({ roleId }: { roleId: string | null }) => (roleId ? <div>Drawer open for {roleId}</div> : null),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage(
  session: { tenant: { type: 'platform' | 'customer'; id?: string } } | null,
  hasAnyPermission: (codes: string[]) => boolean = () => true,
) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ session, hasAnyPermission } as unknown as ReturnType<typeof usePermission>)
  const FieldOfficersPage = (await import('./FieldOfficersPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/field-officers']}>
        <Routes>
          <Route path="/field-officers" element={<FieldOfficersPage />} />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FieldOfficersPage — platform-tenant gate is a lightweight outer check, not an after-the-fact one', () => {
  it('a platform-tenant session renders the roster card grid and fires the role-type/role/geo-profile queries', async () => {
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
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/field-officers']}>
          <Routes>
            <Route path="/field-officers" element={<FieldOfficersPage />} />
            <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText(/couldn't load field officer locations/i)).toBeInTheDocument()
    expect(screen.queryByText(/failed to load field officers/i)).not.toBeInTheDocument()

    vi.doUnmock('@/features/geo-profile/hooks/useGeoProfiles')
  })
})

describe('FieldOfficersPage — a roster card opens the real drawer, not a table link', () => {
  it('clicking a roster card opens FoRealDrawer for that role id', async () => {
    vi.clearAllMocks()
    const user = userEvent.setup()
    await renderPage({ tenant: { type: 'platform' } })

    await user.click(await screen.findByText('Jane FO'))

    expect(await screen.findByText('Drawer open for role-1')).toBeInTheDocument()
  })
})

describe('FieldOfficersPage — Roster/Assignments/Devices tab switch', () => {
  it('defaults to the Roster tab and switches to Devices on click', async () => {
    vi.clearAllMocks()
    const user = userEvent.setup()
    await renderPage({ tenant: { type: 'platform' } })

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /devices/i }))

    expect(screen.getByText('Jane FO')).toBeInTheDocument()
  })

  it('switches to the Assignments tab and renders the weekly grid', async () => {
    vi.clearAllMocks()
    const user = userEvent.setup()
    await renderPage({ tenant: { type: 'platform' } })

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /assignments/i }))

    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(screen.getByText('FO')).toBeInTheDocument()
  })
})

describe('FieldOfficersPage — "Add FO" mounting and visibility', () => {
  it('renders a disabled placeholder button, not the real CreateFoModal, while tenantId is unresolved', async () => {
    vi.clearAllMocks()
    // tenant has no id yet — mirrors a session still settling
    await renderPage({ tenant: { type: 'platform' } })

    const button = await screen.findByRole('button', { name: /add fo/i })
    expect(button).toBeDisabled()
  })

  it('renders the real, enabled CreateFoModal trigger once tenantId and foTypeId are both resolved', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'platform', id: 't-platform-1' } })

    const button = await screen.findByRole('button', { name: /add fo/i })
    expect(button).not.toBeDisabled()
  })

  it('renders no "Add FO" button at all when the caller lacks tenant:admin/tenant:manage', async () => {
    vi.clearAllMocks()
    await renderPage({ tenant: { type: 'platform', id: 't-platform-1' } }, () => false)

    await screen.findByText('Jane FO')
    expect(screen.queryByRole('button', { name: /add fo/i })).not.toBeInTheDocument()
  })

  it('clicking the real "Add FO" button opens the create-FO dialog', async () => {
    vi.clearAllMocks()
    const user = userEvent.setup()
    await renderPage({ tenant: { type: 'platform', id: 't-platform-1' } })

    await user.click(await screen.findByRole('button', { name: /add fo/i }))

    expect(await screen.findByText('Add field officer')).toBeInTheDocument()
  })
})
