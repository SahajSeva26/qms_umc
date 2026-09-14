import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: vi.fn(async () => ({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'rt-mr-1', code: 'pharma-mr', name: 'Pharma MR' }] },
    })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// field-officer used to route through this hook too (with an unscoped
// "platform" mode) — removed once CampFoPicker switched to
// useNearestGeoProfiles for coverage-radius-based eligibility. This hook is
// pharma-mr/CampMrPicker-only again; these are its only remaining callers.
describe('useTenantScopedRolePicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('scopes both RoleType and Role queries to the given tenant — pharma-mr is customer-tenant-owned', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { useTenantScopedRolePicker } = await import('./useTenantScopedRolePicker')

    renderHook(() => useTenantScopedRolePicker('ravi', 'tenant-1', 'pharma-mr', true), { wrapper: makeWrapper() })

    await waitFor(() =>
      expect(accessManagementService.searchRoleTypes).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'pharma-mr', tenant: 'tenant-1' }),
      ),
    )
    await waitFor(() =>
      expect(accessManagementService.searchRoles).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rt-mr-1', tenant: 'tenant-1' }),
      ),
    )
  })

  it('with no tenant: never queries ("select a company first" behavior)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { useTenantScopedRolePicker } = await import('./useTenantScopedRolePicker')

    renderHook(() => useTenantScopedRolePicker('ravi', undefined, 'pharma-mr', true), { wrapper: makeWrapper() })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(accessManagementService.searchRoleTypes).not.toHaveBeenCalled()
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
  })

  it('a RoleType-lookup failure surfaces as `error`, not a silent empty result', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockRejectedValue(
      Object.assign(new Error('Forbidden'), { response: { status: 403 } }),
    )
    const { useTenantScopedRolePicker } = await import('./useTenantScopedRolePicker')

    const { result } = renderHook(
      () => useTenantScopedRolePicker('ravi', 'tenant-1', 'pharma-mr', true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
    expect(result.current.roles).toEqual([])
  })
})
