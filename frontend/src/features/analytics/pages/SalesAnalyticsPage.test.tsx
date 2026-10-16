import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

// Mirrors the app's actual default (lib/api/queryClient.ts's retry:1), NOT a test-only retry:false
// — proves the page's own retry:false wins, not that the test wrapper hid the bug.
function wrapperWithAppDefaultRetry(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function mockPermissions(codes: string[]) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (required: string[]) => required.some((c) => codes.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

function reportFixture() {
  return {
    summary: { totalLeads: 120, converted: 40, lost: 15, open: 65 },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-02-14', to: '2026-03-15', data: [] } },
    kpis: { pipelineValue: 500000, wonValue: 200000, wonCount: 8, avgDealSize: 25000, winRate: 60, salesVelocityDays: 12, topRep: { salesPerson: 'r1', name: 'Priya', wonValue: 100000, wonCount: 4 } },
  }
}

function leadsListFixture() {
  return { count: 1, items: [{ id: 'l1', code: 'ld-1', tenant: { name: 'Mankind', code: 'mk' }, estimatedValue: 500000, status: 'new' }] }
}

async function mockBothEndpoints() {
  const api = (await import('@/lib/api/api')).default
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/leads/report') return { data: { success: true, message: '', data: reportFixture() } }
    if (url === '/leads') return { data: { success: true, message: '', data: leadsListFixture() } }
    throw new Error(`unexpected call to ${url}`)
  })
}

describe('SalesAnalyticsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lead:manage: makes exactly two requests — /leads/report and a full /leads sweep — with explicit local-calendar date params', async () => {
    mockPermissions(['lead:manage'])
    const api = (await import('@/lib/api/api')).default
    await mockBothEndpoints()
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    const calls = vi.mocked(api.get).mock.calls
    const reportCall = calls.find(([url]) => url === '/leads/report')
    const leadsCall = calls.find(([url]) => url === '/leads')
    expect(reportCall).toBeDefined()
    expect(leadsCall).toBeDefined()

    const reportParams = (reportCall?.[1] as { params?: { from?: string; to?: string } } | undefined)?.params
    expect(reportParams?.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(reportParams?.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const leadsParams = (leadsCall?.[1] as { params?: { fyFrom?: string; fyTo?: string } } | undefined)?.params
    expect(leadsParams?.fyFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(leadsParams?.fyTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('lead:search alone: makes zero calls and shows the not-available state', async () => {
    mockPermissions(['lead:search'])
    const api = (await import('@/lib/api/api')).default
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    expect(await screen.findByText(/Not available for your access level — requires lead:manage/i)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('tenant:manage alone: makes zero calls and shows the not-available state (no manage fallback on this route)', async () => {
    mockPermissions(['tenant:manage'])
    const api = (await import('@/lib/api/api')).default
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    expect(await screen.findByText(/Not available for your access level — requires lead:manage/i)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('never automatically retries either request, even under the app-wide retry:1 default', async () => {
    mockPermissions(['lead:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapperWithAppDefaultRetry(<SalesAnalyticsPage />)

    await screen.findByText('Failed to load sales analytics.')
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('Retry after a partial failure only re-fetches the endpoint that actually failed', async () => {
    mockPermissions(['lead:manage'])
    const api = (await import('@/lib/api/api')).default
    let reportCallCount = 0
    let leadsCallCount = 0
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/leads/report') {
        reportCallCount++
        throw new Error('report failed')
      }
      if (url === '/leads') {
        leadsCallCount++
        return { data: { success: true, message: '', data: leadsListFixture() } }
      }
      throw new Error(`unexpected call to ${url}`)
    })
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    await screen.findByText('Failed to load sales analytics.')
    expect(reportCallCount).toBe(1)
    expect(leadsCallCount).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(reportCallCount).toBe(2))
    expect(leadsCallCount).toBe(1)
  })

  it('labels selected-period metrics (won value/count, win rate) distinctly from all-time metrics (pipeline value, avg deal size, velocity, top rep)', async () => {
    mockPermissions(['lead:manage'])
    await mockBothEndpoints()
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    expect(await screen.findByText('Pipeline value')).toBeInTheDocument()
    expect(screen.getByText('current, open leads')).toBeInTheDocument()
    expect(screen.getByText(/selected period.*8 won/)).toBeInTheDocument()
    expect(screen.getAllByText('selected period').length).toBeGreaterThan(0)
    expect(screen.getByText('all-time, won leads')).toBeInTheDocument()
    expect(screen.getByText('all-time, created → won')).toBeInTheDocument()
    expect(screen.getByText(/all-time.*Priya.*4 won/)).toBeInTheDocument()
  })

  it('renders "Top accounts by value" built from the real lead sweep, grouped by tenant', async () => {
    mockPermissions(['lead:manage'])
    await mockBothEndpoints()
    const SalesAnalyticsPage = (await import('./SalesAnalyticsPage')).default

    wrapper(<SalesAnalyticsPage />)

    expect(await screen.findByText('Top accounts by value')).toBeInTheDocument()
    expect(screen.getByText('Mankind')).toBeInTheDocument()
  })
})
