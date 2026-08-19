import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: vi.fn(async () => ({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'rt-fo-1', code: 'field-officer', name: 'Field Officer' }] },
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

describe('useFieldOfficerRoles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves the field-officer RoleType id first, then scopes the Roles query to exactly that type', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { useFieldOfficerRoles } = await import('@/features/inventory/real/hooks/useFieldOfficerRoles')

    renderHook(() => useFieldOfficerRoles(), { wrapper: makeWrapper() })

    await waitFor(() =>
      expect(accessManagementService.searchRoleTypes).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'field-officer' }),
      ),
    )

    await waitFor(() =>
      expect(accessManagementService.searchRoles).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rt-fo-1' }),
      ),
    )
  })
})
