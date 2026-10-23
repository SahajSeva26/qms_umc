import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import TenantDetailPage from './TenantDetailPage'
import { usePermission } from '@/hooks/usePermission'
import { useTenant } from '@/features/access-management/tenant/hooks/useTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useProjects } from '@/features/projects'
import { useInvoiceReport } from '@/features/billing'
import { useDivisionsShared } from '@/hooks/useDivisionsShared'
import type { Tenant } from '@/types/accessManagement.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/access-management/tenant/hooks/useTenant')
vi.mock('@/features/access-management/tenant/hooks/useTenants')
vi.mock('@/features/access-management/role/hooks/useRole')
vi.mock('@/features/projects')
vi.mock('@/features/billing')
vi.mock('@/hooks/useDivisionsShared')
vi.mock('@/lib/file/file.service', () => ({
  fileService: { searchFiles: vi.fn().mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } }) },
}))

const TENANT: Tenant = { id: 't-1', code: 'acme', name: 'Acme Pharma', type: 'customer', status: 'active' } as Tenant

function mockPermission(granted: string[]) {
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: (code: string) => granted.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => granted.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

function mockBaselineHooks() {
  vi.mocked(useTenant).mockReturnValue({ data: { success: true, message: '', data: TENANT }, isLoading: false, error: null } as unknown as ReturnType<typeof useTenant>)
  vi.mocked(useTenants).mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useTenants>)
  vi.mocked(useRole).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useRole>)
  vi.mocked(useProjects).mockReturnValue({ data: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof useProjects>)
  vi.mocked(useInvoiceReport).mockReturnValue({ report: undefined, isLoading: false, error: null, refetch: vi.fn() } as unknown as ReturnType<typeof useInvoiceReport>)
  vi.mocked(useDivisionsShared).mockReturnValue({ data: { success: true, message: '', data: { count: 0, items: [] } }, isLoading: false, error: null } as unknown as ReturnType<typeof useDivisionsShared>)
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/tenants/t-1']}>
        <Routes>
          <Route path="/admin/tenants/:id" element={<TenantDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TenantDetailPage — Divisions section visibility matches GET /divisions\' real route guard (division:manage/division:search/tenant:admin/lead:manage)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockBaselineHooks()
  })

  it('shows the Divisions section for a division:search-only caller (e.g. a sales rep) — regression for the bug where this was missing from both canViewDivisions and canFilterDivisionsByTenant', () => {
    mockPermission(['division:search', 'tenant:search'])
    renderPage()

    expect(screen.getByText('Divisions')).toBeInTheDocument()
    expect(vi.mocked(useDivisionsShared).mock.calls[0]?.[1]).toBe(true)
  })

  it('shows the Divisions section for a lead:manage caller (e.g. Sales Head) — unchanged prior behavior', () => {
    mockPermission(['lead:manage'])
    renderPage()

    expect(screen.getByText('Divisions')).toBeInTheDocument()
  })

  it('shows the Divisions section for a division:manage caller — unchanged prior behavior', () => {
    mockPermission(['division:manage'])
    renderPage()

    expect(screen.getByText('Divisions')).toBeInTheDocument()
  })

  it('hides the Divisions section entirely for a caller with none of the 4 accepted codes', () => {
    mockPermission(['tenant:search'])
    renderPage()

    expect(screen.queryByText('Divisions')).not.toBeInTheDocument()
    expect(vi.mocked(useDivisionsShared).mock.calls[0]?.[1]).toBe(false)
  })
})

describe('TenantDetailPage — "Edit client" button matches PUT /tenants/:id\'s real route guard (tenant:update OR tenant:manage)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockBaselineHooks()
  })

  it('shows Edit client for a tenant:manage caller', () => {
    mockPermission(['tenant:manage'])
    renderPage()

    expect(screen.getByRole('button', { name: /edit client/i })).toBeInTheDocument()
  })

  // Regression: PUT /tenants/:id (tenant.routes.ts) accepts tenant:update as well as tenant:manage —
  // canManageTenant previously checked only tenant:manage via hasPermission, a single code.
  it('shows Edit client for a tenant:update-only caller', () => {
    mockPermission(['tenant:update'])
    renderPage()

    expect(screen.getByRole('button', { name: /edit client/i })).toBeInTheDocument()
  })

  it('hides Edit client for a caller with neither code', () => {
    mockPermission(['tenant:search'])
    renderPage()

    expect(screen.queryByRole('button', { name: /edit client/i })).not.toBeInTheDocument()
  })
})
