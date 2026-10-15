import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'

vi.mock('@/hooks/usePermission')
vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

function wrapper(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function mockPermissions(codes: string[]) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (required: string[]) => required.some((c) => codes.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

describe('FoPerformanceTab', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })
  })

  it('neither permission: both sections show "not available", no API calls fired', async () => {
    mockPermissions([])
    const api = (await import('@/lib/api/api')).default
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    expect(screen.getAllByText(/Not available for your access level/i).length).toBe(2)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('inventory-assignment:manage only: roster section not gated, leaderboard/region still unavailable', async () => {
    mockPermissions(['inventory-assignment:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/inventory-assignments/report') {
        return { data: { success: true, message: '', data: { summary: { totalFieldOfficers: 0, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [] } } }
      }
      throw new Error(`unexpected call to ${url}`)
    })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    // The region section (gated on camp:manage only) still shows "not available".
    expect(await screen.findByText(/Not available for your access level — requires camp:manage/i)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/camps', expect.anything())
    expect(api.get).not.toHaveBeenCalledWith('/geo-profiles', expect.anything())
  })

  it('camp:manage only: leaderboard/region sections not gated, roster still unavailable', async () => {
    mockPermissions(['camp:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    // Leaderboard card still gates on BOTH permissions (needs the roster too) — "not available" shown there,
    // but the region card (camp:manage only) proceeds to fetch.
    expect(await screen.findByText(/Not available for your access level — requires inventory-assignment:manage/i)).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/camps', expect.anything())
    expect(api.get).toHaveBeenCalledWith('/geo-profiles', expect.anything())
    expect(api.get).not.toHaveBeenCalledWith('/inventory-assignments/report')
  })

  it('tenant:manage alone does NOT unlock the leaderboard/region (the route guard accepts it, but camp.service.ts\'s own-scope only lifts for camp:manage)', async () => {
    mockPermissions(['tenant:manage'])
    const api = (await import('@/lib/api/api')).default
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    expect(screen.getAllByText(/Not available for your access level/i).length).toBe(2)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('both permissions: leaderboard renders roster rows with real data, no fabricated occupancy/efficiency/rating', async () => {
    mockPermissions(['camp:manage', 'inventory-assignment:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/inventory-assignments/report') {
        return {
          data: {
            success: true, message: '',
            data: {
              summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 1 },
              fieldOfficers: [{ role: 'r1', name: 'Ravi Kulkarni', code: 'FO-1', devicesHeld: 1, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0 }],
            },
          },
        }
      }
      if (url === '/camps') {
        return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      }
      if (url === '/geo-profiles') {
        return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      }
      throw new Error(`unexpected call to ${url}`)
    })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    expect(await screen.findByText('Ravi Kulkarni')).toBeInTheDocument()
    expect(screen.getByText('FO-1')).toBeInTheDocument()
    // Occ%/Eff%/★ columns render as a plain dash — never a fabricated number.
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBe(3)
  })
})
