import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('KPI strip: both permissions granted renders real derived totals, not dashes', async () => {
    mockPermissions(['camp:manage', 'inventory-assignment:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/inventory-assignments/report') {
        return {
          data: {
            success: true, message: '',
            data: {
              summary: { totalFieldOfficers: 2, fieldOfficersHoldingInventory: 1 },
              fieldOfficers: [
                { role: 'r1', name: 'Ravi Kulkarni', code: 'FO-1', devicesHeld: 1, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0 },
                { role: 'r2', name: 'Anita Rao', code: 'FO-2', devicesHeld: 0, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0 },
              ],
            },
          },
        }
      }
      if (url === '/camps') {
        return {
          data: {
            success: true, message: '',
            data: {
              count: 2,
              items: [
                { id: 'c1', code: 'c1', type: 'screening', date: '2026-01-01', status: 'closed', fo: { _id: 'r1', code: 'FO-1', name: 'Ravi' }, stats: { patients: 5, patientsCompleted: 5 } },
                { id: 'c2', code: 'c2', type: 'screening', date: '2026-01-02', status: 'live', fo: { _id: 'r1', code: 'FO-1', name: 'Ravi' }, stats: { patients: 2, patientsCompleted: 0 } },
              ],
            },
          },
        }
      }
      if (url === '/geo-profiles') {
        return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      }
      throw new Error(`unexpected call to ${url}`)
    })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    // totalFOs = 2, totalCamps = 2 (both, regardless of status), totalClosed = 1 (only c1), totalPatients = 5+2 = 7.
    const kpiStrip = screen.getByText('Active FOs').closest('[style*="auto-fit, minmax(200px"]') as HTMLElement
    await waitFor(() => expect(within(kpiStrip).getByText('Active FOs').closest('.rounded-xl')?.textContent).toContain('2'))
    expect(within(kpiStrip).getByText('Closed camps').closest('.rounded-xl')?.textContent).toContain('1')
    expect(within(kpiStrip).getByText('Patients').closest('.rounded-xl')?.textContent).toContain('7')
  })

  it('KPI strip: neither permission renders "-" for every tile, no fabricated zeroes', async () => {
    mockPermissions([])
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    expect(await screen.findByText('Active FOs')).toBeInTheDocument()
    expect(screen.getByText('Camps')).toBeInTheDocument()
    expect(screen.getByText('Closed camps')).toBeInTheDocument()
    expect(screen.getByText('Patients')).toBeInTheDocument()
    // 4 KPI tiles + 2 "not available" sections worth of dashes-equivalent — just confirm every KPI tile shows "-".
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  it('KPI strip: a camps-sweep failure leaves Camps/Closed/Patients at "-", never a false 0, even though roster succeeded', async () => {
    mockPermissions(['camp:manage', 'inventory-assignment:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/inventory-assignments/report') {
        return {
          data: {
            success: true, message: '',
            data: { summary: { totalFieldOfficers: 3, fieldOfficersHoldingInventory: 1 }, fieldOfficers: [] },
          },
        }
      }
      if (url === '/camps') throw new Error('camps sweep failed')
      if (url === '/geo-profiles') return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    const kpiStrip = (await screen.findByText('Active FOs')).closest('[style*="auto-fit, minmax(200px"]') as HTMLElement
    // Active FOs is real (roster alone drives it) — must NOT be stuck at "-".
    await waitFor(() => expect(within(kpiStrip).getByText('Active FOs').closest('.rounded-xl')?.textContent).toContain('3'))
    // Camps/Closed/Patients depend on the failed camps sweep — must show "-", never a false "0".
    expect(within(kpiStrip).getByText('Camps').closest('.rounded-xl')?.textContent).toContain('-')
    expect(within(kpiStrip).getByText('Closed camps').closest('.rounded-xl')?.textContent).toContain('-')
    expect(within(kpiStrip).getByText('Patients').closest('.rounded-xl')?.textContent).toContain('-')
  })

  it('Retry after a partial failure in the leaderboard section only re-fetches the endpoint that actually failed', async () => {
    mockPermissions(['camp:manage', 'inventory-assignment:manage'])
    const api = (await import('@/lib/api/api')).default
    let rosterCallCount = 0
    let campsCallCount = 0
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/inventory-assignments/report') {
        rosterCallCount++
        throw new Error('roster failed')
      }
      if (url === '/camps') {
        campsCallCount++
        return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      }
      if (url === '/geo-profiles') return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FoPerformanceTab = (await import('./FoPerformanceTab')).default

    wrapper(<FoPerformanceTab periodDays="all" />)

    await screen.findByText('Failed to load FO leaderboard.')
    expect(rosterCallCount).toBe(1)
    expect(campsCallCount).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(rosterCallCount).toBe(2))
    // The camps sweep never failed, so Retry must not re-fire it.
    expect(campsCallCount).toBe(1)
  })
})
