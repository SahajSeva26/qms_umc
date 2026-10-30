import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: { searchRoles: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function role(id: string, email: string, typeName: string) {
  return {
    id, code: id, name: `${typeName} role`, status: 'active', permissions: [],
    type: { code: typeName.toLowerCase().replaceAll(' ', '-'), name: typeName },
    user: { firstName: 'Jane', email }, tenant: 'tenant-1', createdAt: '', updatedAt: '',
  }
}

describe('useUserRoleLabels', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not call GET /roles when the viewer lacks role search access', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { useUserRoleLabels } = await import('./useUserRoleLabels')
    const { result } = renderHook(() => useUserRoleLabels(['jane@example.com'], false), { wrapper })

    expect(result.current).toEqual({})
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
  })

  it('consumes every fuzzy-search page and keeps only exact-email roles', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (query) => ({
      success: true,
      message: '',
      data: {
        count: 11,
        items: query.page === '1'
          ? [role('role-1', 'jane@example.com', 'Sales Head'), role('collision', 'jane+old@example.com', 'Admin')]
          : [role('role-2', 'jane@example.com', 'Camp Coordinator')],
      },
    } as never))

    const { useUserRoleLabels } = await import('./useUserRoleLabels')
    const { result } = renderHook(() => useUserRoleLabels(['jane@example.com'], true), { wrapper })
    await waitFor(() => expect(result.current['jane@example.com']?.isLoading).toBe(false))

    expect(result.current['jane@example.com'].roles).toEqual([
      { code: 'sales-head', name: 'Sales Head' },
      { code: 'camp-coordinator', name: 'Camp Coordinator' },
    ])
    expect(vi.mocked(accessManagementService.searchRoles).mock.calls.map(([query]) => query.page)).toEqual(expect.arrayContaining(['1', '2']))
  })
})
