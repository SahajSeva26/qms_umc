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
    totalInvoices: 24,
    totalInvoiced: 1200000,
    statusCounts: [
      { status: 'issued', count: 10, total: 500000 },
      { status: 'paid', count: 8, total: 400000 },
      { status: 'draft', count: 6, total: 300000 },
    ],
  }
}

function invoicesListFixture() {
  return {
    count: 24,
    items: [
      {
        id: 'i1', code: 'INV-000024',
        tenant: { _id: 't1', name: 'Mankind Pharma', code: 'mk' },
        project: { _id: 'p1', name: 'Diabetes Screening Q1', code: 'ds-q1' },
        issueDate: '2026-03-15', total: 50000, status: 'issued', syncToTally: false, stageHistory: [], createdAt: '', updatedAt: '',
      },
    ],
  }
}

describe('FinancialAnalyticsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('authorized (invoice:search): makes exactly two requests — report + a 10-row invoices list — with explicit local-calendar date params', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: reportFixture() } }
      if (url === '/invoices') return { data: { success: true, message: '', data: invoicesListFixture() } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    const calls = vi.mocked(api.get).mock.calls
    const reportCall = calls.find(([url]) => url === '/invoices/report')
    const listCall = calls.find(([url]) => url === '/invoices')
    expect(reportCall).toBeDefined()
    expect(listCall).toBeDefined()

    const reportParams = (reportCall?.[1] as { params?: { dateFrom?: string; dateTo?: string } } | undefined)?.params
    expect(reportParams?.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(reportParams?.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const listParams = (listCall?.[1] as { params?: { dateFrom?: string; dateTo?: string; limit?: string } } | undefined)?.params
    expect(listParams?.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(listParams?.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(listParams?.limit).toBe('10')
  })

  it('invoice:manage alone: also makes exactly two requests (any of the three allowed permissions suffices)', async () => {
    mockPermissions(['invoice:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: reportFixture() } }
      if (url === '/invoices') return { data: { success: true, message: '', data: invoicesListFixture() } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })

  it('tenant:manage alone: also makes exactly two requests (any of the three allowed permissions suffices)', async () => {
    mockPermissions(['tenant:manage'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: reportFixture() } }
      if (url === '/invoices') return { data: { success: true, message: '', data: invoicesListFixture() } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })

  it('no permission at all: makes zero calls and shows the not-available state', async () => {
    mockPermissions([])
    const api = (await import('@/lib/api/api')).default
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    expect(await screen.findByText(/Not available for your access level/i)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('never automatically retries a failed report or list request, even under the app-wide retry:1 default', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapperWithAppDefaultRetry(<FinancialAnalyticsPage />)

    await screen.findByText('Failed to load financial analytics.')
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('Retry after a partial failure only re-fetches the endpoint that actually failed', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    let reportCallCount = 0
    let listCallCount = 0
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') {
        reportCallCount++
        throw new Error('report failed')
      }
      if (url === '/invoices') {
        listCallCount++
        return { data: { success: true, message: '', data: invoicesListFixture() } }
      }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    await screen.findByText('Failed to load financial analytics.')
    expect(reportCallCount).toBe(1)
    expect(listCallCount).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(reportCallCount).toBe(2))
    // The list call never failed, so Retry must not re-fire it.
    expect(listCallCount).toBe(1)
  })

  it('renders status-stage labels/values taken directly from the report response, not invented', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: reportFixture() } }
      if (url === '/invoices') return { data: { success: true, message: '', data: invoicesListFixture() } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    expect(await screen.findByText('Total invoice value')).toBeInTheDocument()
    // Paid-stage value = statusCounts['paid'].total = 400000; not-yet-paid = issued(500000) + draft(300000) = 800000.
    expect(screen.getByText('Paid-stage value')).toBeInTheDocument()
    expect(screen.getByText('Not-yet-paid-stage value')).toBeInTheDocument()
    // "Issued"/"Paid" appear both in the funnel chart and the recent-invoices table.
    expect(screen.getAllByText('Issued').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('INV-000024')).toBeInTheDocument()
  })

  it('renders the recent-invoices Client/Project columns from the populated tenant/project, not a raw id', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: reportFixture() } }
      if (url === '/invoices') return { data: { success: true, message: '', data: invoicesListFixture() } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    expect(await screen.findByText('Mankind Pharma')).toBeInTheDocument()
    expect(screen.getByText('Diabetes Screening Q1')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('renders an honest empty state instead of zero-width coloured bars when the period has no invoices', async () => {
    mockPermissions(['invoice:search'])
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/invoices/report') return { data: { success: true, message: '', data: { totalInvoices: 0, totalInvoiced: 0, statusCounts: [] } } }
      if (url === '/invoices') return { data: { success: true, message: '', data: { count: 0, items: [] } } }
      throw new Error(`unexpected call to ${url}`)
    })
    const FinancialAnalyticsPage = (await import('./FinancialAnalyticsPage')).default

    wrapper(<FinancialAnalyticsPage />)

    expect(await screen.findAllByText('No invoices in the selected period.')).toHaveLength(2)
    // None of the 6 status labels should render as funnel bars when there are no invoices.
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    expect(screen.queryByText('Approved')).not.toBeInTheDocument()
    expect(screen.queryByText('GRN Signed')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument()
  })
})
