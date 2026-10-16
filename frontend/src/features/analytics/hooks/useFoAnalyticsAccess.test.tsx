import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(),
}))

async function mockPermissions(codes: string[]) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (required: string[]) => required.some((c) => codes.includes(c)),
  } as ReturnType<typeof usePermission>)
}

describe('useFoAnalyticsAccess', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('camp-only: leaderboard/region available, roster not', async () => {
    await mockPermissions(['camp:manage'])
    const { useFoAnalyticsAccess } = await import('./useFoAnalyticsAccess')
    const { result } = renderHook(() => useFoAnalyticsAccess())

    expect(result.current.canViewFoLeaderboard).toBe(true)
    expect(result.current.canViewFoRoster).toBe(false)
  })

  it('inventory-only: roster available, leaderboard/region not', async () => {
    await mockPermissions(['inventory-assignment:manage'])
    const { useFoAnalyticsAccess } = await import('./useFoAnalyticsAccess')
    const { result } = renderHook(() => useFoAnalyticsAccess())

    expect(result.current.canViewFoRoster).toBe(true)
    expect(result.current.canViewFoLeaderboard).toBe(false)
  })

  it('both: everything available', async () => {
    await mockPermissions(['camp:manage', 'inventory-assignment:manage'])
    const { useFoAnalyticsAccess } = await import('./useFoAnalyticsAccess')
    const { result } = renderHook(() => useFoAnalyticsAccess())

    expect(result.current.canViewFoRoster).toBe(true)
    expect(result.current.canViewFoLeaderboard).toBe(true)
  })

  it('neither: nothing available', async () => {
    await mockPermissions([])
    const { useFoAnalyticsAccess } = await import('./useFoAnalyticsAccess')
    const { result } = renderHook(() => useFoAnalyticsAccess())

    expect(result.current.canViewFoRoster).toBe(false)
    expect(result.current.canViewFoLeaderboard).toBe(false)
  })

  it('tenant:manage alone does NOT unlock the leaderboard — the route guard accepts it, but camp.service.ts only lifts own-scope for camp:manage, so a tenant:manage-only caller would see a scoped subset masquerading as org-wide', async () => {
    await mockPermissions(['tenant:manage'])
    const { useFoAnalyticsAccess } = await import('./useFoAnalyticsAccess')
    const { result } = renderHook(() => useFoAnalyticsAccess())

    expect(result.current.canViewFoLeaderboard).toBe(false)
  })
})
