import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/admin/components/PharmaClientsTab', () => ({
  default: () => <div>Pharma Clients content</div>,
}))
vi.mock('@/features/access-management/role/pages/RolesListPage', () => ({
  default: () => <div>Roles content</div>,
}))
vi.mock('@/features/access-management/role-type/pages/RoleTypesListPage', () => ({
  default: () => <div>Role Types content</div>,
}))
vi.mock('@/features/access-management/permission-group/pages/PermissionGroupsListPage', () => ({
  default: () => <div>Permission Groups content</div>,
}))
vi.mock('@/features/admin/pages/UsersPage', () => ({
  default: () => <div>Users content</div>,
}))

function mockPermission(codes: string[]) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (wanted: string[]) => wanted.some((c) => codes.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

async function renderPage(initialEntries: string[] = ['/admin']) {
  const AdminPage = (await import('./AdminPage')).default
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminPage — tab gating and default-view selection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('defaults to Pharma Clients for a caller who holds tenant:search', async () => {
    mockPermission(['tenant:search'])
    await renderPage()

    expect(await screen.findByText('Pharma Clients content')).toBeInTheDocument()
  })

  it('never calls into Pharma Clients and defaults to Roles for a caller who ONLY holds role:search (no tenant:search/tenant:manage)', async () => {
    mockPermission(['role:search'])
    await renderPage()

    expect(await screen.findByText('Roles content')).toBeInTheDocument()
    expect(screen.queryByText('Pharma Clients content')).not.toBeInTheDocument()
    // The Clients tab itself must not even be offered as a strip option.
    expect(screen.queryByRole('button', { name: /pharma clients/i })).not.toBeInTheDocument()
  })

  it('defaults to Users for a caller who only holds user:search', async () => {
    mockPermission(['user:search'])
    await renderPage()

    expect(await screen.findByText('Users content')).toBeInTheDocument()
    expect(screen.queryByText('Pharma Clients content')).not.toBeInTheDocument()
  })

  it('shows a permission-restricted message, not a blank/crashed page, when the caller has none of the 5 tab permissions', async () => {
    mockPermission([])
    await renderPage()

    expect(await screen.findByText(/don't have permission to view any section/i)).toBeInTheDocument()
  })

  it('falls back to the first permitted tab when ?view= requests a tab the caller cannot reach', async () => {
    mockPermission(['role:search'])
    await renderPage(['/admin?view=clients'])

    expect(await screen.findByText('Roles content')).toBeInTheDocument()
    expect(screen.queryByText('Pharma Clients content')).not.toBeInTheDocument()
  })

  // Regression: role:get/permission-group:get/user:get/user:update only gate GET-by-id, not the
  // search endpoint each list page calls unconditionally on load (GET /roles, /permission-groups,
  // /users) — offering the tab to a caller who holds only these would 403 the moment they opened it.
  it('never offers the Roles tab to a caller who ONLY holds role:get (not role:search)', async () => {
    mockPermission(['role:get'])
    await renderPage()

    expect(screen.queryByRole('button', { name: /^roles$/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Roles content')).not.toBeInTheDocument()
    expect(await screen.findByText(/don't have permission to view any section/i)).toBeInTheDocument()
  })

  it('never offers the Permission Groups tab to a caller who ONLY holds permission-group:get (not permission-group:search/tenant:admin)', async () => {
    mockPermission(['permission-group:get'])
    await renderPage()

    expect(screen.queryByRole('button', { name: /permission groups/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Permission Groups content')).not.toBeInTheDocument()
    expect(await screen.findByText(/don't have permission to view any section/i)).toBeInTheDocument()
  })

  it('never offers the Users tab to a caller who ONLY holds user:get and user:update (not user:search)', async () => {
    mockPermission(['user:get', 'user:update'])
    await renderPage()

    expect(screen.queryByRole('button', { name: /^users$/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Users content')).not.toBeInTheDocument()
    expect(await screen.findByText(/don't have permission to view any section/i)).toBeInTheDocument()
  })
})
