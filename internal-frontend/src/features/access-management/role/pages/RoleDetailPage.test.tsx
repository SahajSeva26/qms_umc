import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Routes, Route } from 'react-router-dom'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getRole: vi.fn(),
    updateRole: vi.fn(async () => ({ data: { id: 'role-a' } })),
    searchRoleTypes: vi.fn(async () => ({ data: { items: [], count: 0 } })),
    searchTenants: vi.fn(async () => ({ data: { items: [], count: 0 } })),
    searchRoles: vi.fn(async () => ({ data: { items: [], count: 0 } })),
  },
}))

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-a',
    code: 'role-a-code',
    name: 'Original Name',
    description: '',
    permissions: [],
    status: 'active',
    type: { _id: 'rt-1', name: 'Sales Rep', code: 'sales-rep' },
    user: { _id: 'u-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    tenant: { _id: 't-1', name: 'Acme', code: 'acme' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as RoleEntity
}

function renderAtRoute(queryClient: QueryClient, initialPath: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin/roles/:id" element={<RoleDetailPageLazy />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Import lazily inside the test body (after the vi.mock hoist) rather than a top-level
// default import, matching this codebase's established mocking precedent (doctorCacheIsolation.test.tsx).
let RoleDetailPageLazy: typeof import('@/features/access-management/role/pages/RoleDetailPage').default

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('RoleDetailPage', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const mod = await import('@/features/access-management/role/pages/RoleDetailPage')
    RoleDetailPageLazy = mod.default
  })

  it('switching from one role URL to another discards unsaved edits and shows the new role fresh', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const roleA = roleFixture({ id: 'role-a', name: 'Role A' })
    const roleB = roleFixture({ id: 'role-b', name: 'Role B', code: 'role-b-code' })

    vi.mocked(accessManagementService.getRole).mockImplementation(async (id: string) => ({
      success: true,
      message: '',
      data: id === 'role-a' ? roleA : roleB,
    }))

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/roles/role-a']}>
          <Routes>
            <Route
              path="/admin/roles/:id"
              element={
                <>
                  <Link to="/admin/roles/role-b">Go to role B</Link>
                  <RoleDetailPageLazy />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const nameInput = await screen.findByLabelText(/^name$/i)
    await waitFor(() => expect(nameInput).toHaveValue('Role A'))

    await user.clear(nameInput)
    await user.type(nameInput, 'Unsaved edit for A')
    expect(nameInput).toHaveValue('Unsaved edit for A')

    await user.click(screen.getByText('Go to role B'))

    await waitFor(() => expect(screen.getByLabelText(/^name$/i)).toHaveValue('Role B'))
    const nameInputAfterNav = screen.getByLabelText(/^name$/i)
    expect(nameInputAfterNav).not.toHaveValue('Unsaved edit for A')
    expect(nameInputAfterNav).not.toHaveValue('Role A')
  })

  it('a background refetch of the same role does not erase an unsaved in-progress edit', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { roleKeys } = await import('@/features/access-management/role/hooks/useRoles')
    const roleA = roleFixture({ id: 'role-a', name: 'Original Name' })

    // First resolution is the initial load; the refetch resolves with a genuinely
    // CHANGED field (description, edited by someone else server-side). TanStack
    // Query's structural sharing only gives a new object reference when the new
    // data is actually deep-different from the last — an unchanged-value refetch
    // would never exercise this bug at all, so the two calls must differ for the
    // test to mean anything.
    const getRoleMock = vi.mocked(accessManagementService.getRole)
    getRoleMock.mockImplementation(async () => {
      const callCount = getRoleMock.mock.calls.length
      return { success: true, message: '', data: { ...roleA, description: callCount <= 1 ? '' : 'Updated by someone else' } }
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    renderAtRoute(queryClient, '/admin/roles/role-a')

    const nameInput = await screen.findByLabelText(/^name$/i)
    await waitFor(() => expect(nameInput).toHaveValue('Original Name'))
    expect(getRoleMock).toHaveBeenCalledTimes(1)

    await user.clear(nameInput)
    await user.type(nameInput, 'Edited Unsaved Name')
    expect(nameInput).toHaveValue('Edited Unsaved Name')

    await queryClient.refetchQueries({ queryKey: roleKeys.detail('role-a') })

    // Wait on the real, observable effect of the refetch completing — a second
    // call to the mocked service — rather than TanStack Query's internal
    // dataUpdateCount bookkeeping.
    await waitFor(() => expect(getRoleMock).toHaveBeenCalledTimes(2))

    // The regression assertion: once the edit form has mounted, it stays fully
    // local until submit — a background refetch must never silently reset any
    // field, edited or not. (Accepted trade-off: server-side changes to OTHER
    // fields made while this page is open won't appear until the page is
    // reopened — simpler than per-field dirty-tracking, and matches how this
    // form behaved before the split for any field the user hadn't touched.)
    await waitFor(() => expect(screen.getByLabelText(/^name$/i)).toHaveValue('Edited Unsaved Name'))
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
  })

  it('a FAILED background refetch keeps the edit form mounted with the unsaved draft intact', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { roleKeys } = await import('@/features/access-management/role/hooks/useRoles')
    const roleA = roleFixture({ id: 'role-a', name: 'Original Name' })

    const getRoleMock = vi.mocked(accessManagementService.getRole)
    getRoleMock.mockImplementation(async () => {
      const callCount = getRoleMock.mock.calls.length
      if (callCount > 1) throw new Error('Network error')
      return { success: true, message: '', data: roleA }
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    renderAtRoute(queryClient, '/admin/roles/role-a')

    const nameInput = await screen.findByLabelText(/^name$/i)
    await waitFor(() => expect(nameInput).toHaveValue('Original Name'))

    await user.clear(nameInput)
    await user.type(nameInput, 'Edited Unsaved Name')
    expect(nameInput).toHaveValue('Edited Unsaved Name')

    // TanStack Query retains its last-known-good `data` when a background
    // refetch fails — `role` stays truthy even though `error` is also set —
    // so the page must keep EditRoleEditor mounted, not fall through to the
    // "Failed to load role" error screen (which would discard the draft).
    await queryClient.refetchQueries({ queryKey: roleKeys.detail('role-a') }).catch(() => {})

    await waitFor(() => expect(getRoleMock).toHaveBeenCalledTimes(2))

    expect(screen.queryByText(/failed to load role/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Edited Unsaved Name')
  })
})
