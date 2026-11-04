import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useFieldOfficerRolePicker } from './useFieldOfficerRolePicker'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoles: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function roleFixture(id: string) {
  return {
    id, code: `fo-${id}`, name: id, status: 'active', permissions: [], type: 'rt-fo', tenant: 't-1',
    user: { firstName: id, email: `${id}@example.com` }, createdAt: '', updatedAt: '',
  } as never
}

describe('useFieldOfficerRolePicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('maps the search box to SearchRoleQuery.user, not name/code', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })

    renderHook(() => useFieldOfficerRolePicker('ravi', 't-1', 'rt-fo', true), { wrapper: makeWrapper() })

    await waitFor(() => expect(accessManagementService.searchRoles).toHaveBeenCalled())
    const query = vi.mocked(accessManagementService.searchRoles).mock.calls[0][0]
    expect(query).toMatchObject({ tenant: 't-1', type: 'rt-fo', status: 'active', user: 'ravi' })
    expect(query).not.toHaveProperty('name')
    expect(query).not.toHaveProperty('code')
  })

  it('its query key never collides with roleKeys\'s namespace', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    renderHook(() => useFieldOfficerRolePicker('ravi', 't-1', 'rt-fo', true), { wrapper })

    await waitFor(() => expect(accessManagementService.searchRoles).toHaveBeenCalled())
    const cachedKeys = queryClient.getQueryCache().getAll().map((q) => q.queryKey[0])
    expect(cachedKeys).not.toContain(roleKeys.all[0])
  })

  it('a query under 2 characters never fires', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    renderHook(() => useFieldOfficerRolePicker('r', 't-1', 'rt-fo', true), { wrapper: makeWrapper() })

    await new Promise((r) => setTimeout(r, 400))
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
  })

  it('loading page 2 retains page 1\'s results with no duplicates', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (query) => {
      const page = Number(query.page)
      return {
        success: true, message: '',
        data: { count: 15, items: [roleFixture(`p${page}-a`), roleFixture(`p${page}-b`)] },
      }
    })

    const { result } = renderHook(() => useFieldOfficerRolePicker('ravi', 't-1', 'rt-fo', true), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.items.length).toBe(2))
    expect(result.current.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b'])

    result.current.fetchNextPage()

    await waitFor(() => expect(result.current.items.length).toBe(4))
    expect(result.current.items.map((i) => i.id)).toEqual(['p1-a', 'p1-b', 'p2-a', 'p2-b'])
  })

  it('hasNextPage correctly reflects accumulated count vs. reported count', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({
      success: true, message: '', data: { count: 2, items: [roleFixture('a'), roleFixture('b')] },
    })

    const { result } = renderHook(() => useFieldOfficerRolePicker('ravi', 't-1', 'rt-fo', true), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.items.length).toBe(2))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('a new search term resets accumulated results (fresh query key, not appended to the old search)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (query) => ({
      success: true, message: '', data: { count: 1, items: [roleFixture(query.user ?? '')] },
    }))

    const { result, rerender } = renderHook(
      ({ search }) => useFieldOfficerRolePicker(search, 't-1', 'rt-fo', true),
      { wrapper: makeWrapper(), initialProps: { search: 'ravi' } },
    )

    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['ravi']))

    rerender({ search: 'priya' })
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['priya']))
  })
})
