import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'

vi.mock('@/hooks/usePermission')
vi.mock('@/hooks/useSession')
vi.mock('@/features/fieldWorkspace/hooks/useMyEmployee', () => ({
  useMyEmployee: () => ({ employee: null, isLoading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@/features/fieldWorkspace/hooks/useMyCamps', () => ({
  useMyCamps: () => ({ data: { data: { items: [], count: 0, summary: { totalCamps: 0, statusCounts: [], typeCounts: [] } } }, isLoading: false, error: null, refetch: vi.fn() }),
}))

function sessionFixture(overrides: Partial<{ tenantType: string; roleTypeCode: string }> = {}) {
  return {
    user: { id: 'u-1', firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test' },
    role: { id: 'role-1', code: 'fo-1', name: 'Jane FO' },
    roleType: { id: 'rt-1', code: overrides.roleTypeCode ?? 'field-officer', name: 'Field Officer' },
    tenant: { id: 't-1', code: 'qms', name: 'QMS', type: overrides.tenantType ?? 'platform' },
    permissions: ['camp:search'],
  }
}

function mockPermission(session: ReturnType<typeof sessionFixture> | null) {
  vi.mocked(usePermission).mockReturnValue({ session, hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
  vi.mocked(useSession).mockReturnValue({ session } as unknown as ReturnType<typeof useSession>)
}

async function renderPage() {
  const FieldWorkspacePage = (await import('./FieldWorkspacePage')).default
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/my-workspace']}>
        <Routes>
          <Route path="/my-workspace" element={<FieldWorkspacePage />} />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Regression: no single permission identifies "field-officer" (camp:search is also held by
// managers/coordinators), so this page must gate on BOTH platform tenant AND the exact role type.
describe('FieldWorkspacePage — access gate', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders the workspace for a platform field-officer session', async () => {
    mockPermission(sessionFixture())
    await renderPage()
    expect(await screen.findByText('Command centre · today + upcoming + open issues + KPIs')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized page')).not.toBeInTheDocument()
  })

  it('redirects a non-field-officer role type, even on the platform tenant', async () => {
    mockPermission(sessionFixture({ roleTypeCode: 'sales-rep' }))
    await renderPage()
    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument()
  })

  it('redirects a field-officer-coded role type on a customer tenant', async () => {
    mockPermission(sessionFixture({ tenantType: 'customer' }))
    await renderPage()
    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument()
  })
})
