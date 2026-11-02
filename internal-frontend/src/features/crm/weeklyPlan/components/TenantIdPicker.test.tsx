import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Regression: a sales rep should only pick a company assigned to them (or unassigned) — a
// tenant:manage holder keeps full visibility.
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPicker() {
  const TenantIdPicker = (await import('./TenantIdPicker')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TenantIdPicker value="" label="" onChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('TenantIdPicker — company scoping by sales rep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('scopes the search to the rep\'s own book when the actor lacks tenant:manage', async () => {
    vi.doMock('@/hooks/useSession', () => ({
      useSession: () => ({ session: { role: { id: 'role-rep-1' } }, hasPermission: () => false }),
    }))

    const user = userEvent.setup()
    await renderPicker()
    await user.type(screen.getByPlaceholderText('Search company...'), 'Ci')

    expect(accessManagementService.searchTenants).toHaveBeenCalledWith(
      expect.objectContaining({ salesRep: 'role-rep-1' }),
    )
  })

  it('shows every company when the actor holds tenant:manage', async () => {
    vi.doMock('@/hooks/useSession', () => ({
      useSession: () => ({ session: { role: { id: 'role-head-1' } }, hasPermission: () => true }),
    }))

    const user = userEvent.setup()
    await renderPicker()
    await user.type(screen.getByPlaceholderText('Search company...'), 'Ci')

    expect(accessManagementService.searchTenants).toHaveBeenCalledWith(
      expect.objectContaining({ salesRep: undefined }),
    )
  })
})
