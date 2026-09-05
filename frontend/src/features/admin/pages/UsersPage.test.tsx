import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useUsers } from '@/features/admin/hooks/useUsers'
import { useUserReport } from '@/features/admin/hooks/useUserReport'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/admin/hooks/useUsers')
vi.mock('@/features/admin/hooks/useUserReport')
vi.mock('@/features/access-management/role/hooks/useRoles')
vi.mock('@/features/access-management/tenant/hooks/useTenants')
vi.mock('@/features/admin/admin.service', () => ({
  adminService: { searchUsers: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })) },
}))

function mockPermission(canViewReport: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: (code: string) => (code === 'user:manage' ? canViewReport : false),
  } as unknown as ReturnType<typeof usePermission>)
}

function mockBaseHooks() {
  vi.mocked(useUsers).mockReturnValue({
    data: { success: true, message: '', data: { count: 0, items: [] } },
    isLoading: false, isError: false, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useUsers>)
  vi.mocked(useRoles).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useRoles>)
  vi.mocked(useTenants).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useTenants>)
}

function reportFixture() {
  return {
    success: true,
    message: '',
    data: {
      summary: { totalUsers: 10, active: 8, inactive: 1, suspended: 1, deleted: 0 },
      demographics: { gender: { male: 5, female: 5, other: 0, unspecified: 0 } },
      security: { lockedAccounts: 2 },
      trends: { registrations: { granularity: 'day' as const, from: '', to: '', data: [{ period: '2026-09-05', count: 1 }] } },
    },
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const UsersPage = (await import('./UsersPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UsersPage — KPI strip permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockBaseHooks()
  })

  it('fetches and renders the report strip when the caller has user:manage', async () => {
    mockPermission(true)
    vi.mocked(useUserReport).mockReturnValue({
      data: reportFixture(), isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUserReport>)

    await renderPage()

    expect(useUserReport).toHaveBeenCalledWith({}, true)
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText(/platform overview/i)).toBeInTheDocument()
  })

  it('never enables the report query and never renders the strip when lacking user:manage', async () => {
    mockPermission(false)
    vi.mocked(useUserReport).mockReturnValue({
      data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUserReport>)

    await renderPage()

    expect(useUserReport).toHaveBeenCalledWith({}, false)
    expect(screen.queryByText('Total users')).not.toBeInTheDocument()
    expect(screen.queryByText(/platform overview/i)).not.toBeInTheDocument()
  })
})
