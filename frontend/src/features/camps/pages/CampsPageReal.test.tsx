import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampReport } from '@/features/camps/hooks/useCampReport'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/camps/hooks/useCampReport')

function mockPermission(canViewReport: boolean, canWrite = false) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => {
      if (codes.includes('camp:manage') && canViewReport) return true
      return canWrite
    },
  } as unknown as ReturnType<typeof usePermission>)
}

function mockCampsRealList() {
  vi.mocked(useCampsReal).mockReturnValue({
    data: { success: true, message: '', data: { count: 0, items: [] } },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCampsReal>)
}

function reportFixture() {
  return {
    success: true,
    message: '',
    data: {
      summary: { totalCamps: 23 },
      byStatus: [
        { status: 'requested' as const, count: 3 },
        { status: 'confirmed' as const, count: 5 },
        { status: 'live' as const, count: 8 },
        { status: 'closed' as const, count: 4 },
        { status: 'cancelled' as const, count: 2 },
        { status: 'cancelled_charged' as const, count: 1 },
      ],
      byType: [
        { type: 'screening' as const, count: 10 },
        { type: 'diet' as const, count: 8 },
        { type: 'lab' as const, count: 5 },
      ],
      byBillingType: [
        { billingType: 'billable' as const, count: 20 },
        { billingType: 'void' as const, count: 3 },
      ],
    },
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const CampsPageReal = (await import('./CampsPageReal')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <CampsPageReal />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampsPageReal — KPI strip backed by GET /camps/report', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCampsRealList()
  })

  it('renders status counts and total from the real report, not a capped list reduction', async () => {
    mockPermission(true)
    vi.mocked(useCampReport).mockReturnValue({
      data: reportFixture(), isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(useCampReport).toHaveBeenCalledWith(true)
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument() // live
    expect(screen.getByText('5')).toBeInTheDocument() // confirmed
  })

  it('never enables the report query and never renders the strip when lacking camp:manage/tenant:manage', async () => {
    mockPermission(false)
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(useCampReport).toHaveBeenCalledWith(false)
    expect(screen.queryByText('23')).not.toBeInTheDocument()
  })

  it('shows its own "Loading camp report…" state independently while the camp table below is already loaded', async () => {
    // The report and the camp list are two independent queries with no shared
    // gating — this proves that intentionally, rather than leaving it an
    // undocumented side effect: the table can finish first and render fully
    // while the KPI strip above it is still resolving its own fetch.
    mockPermission(true)
    mockCampsRealList() // isLoading: false, already resolved
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: true, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(screen.getByText(/loading camp report/i)).toBeInTheDocument()
    // The filter bar (part of the already-resolved camps list section) is
    // present and not blocked by the KPI strip's own separate loading state.
    expect(document.querySelector('input')).toBeInTheDocument()
  })

  it('shows its own error state with a working Retry, independent of the camp table', async () => {
    mockPermission(true)
    mockCampsRealList()
    const refetch = vi.fn()
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: true, refetch,
    } as unknown as ReturnType<typeof useCampReport>)

    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    await renderPage()

    expect(screen.getByText(/failed to load camp report/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
