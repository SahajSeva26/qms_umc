import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampOverviewSection from './CampOverviewSection'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { usePermission } from '@/hooks/usePermission'

vi.mock('@/features/camps/hooks/useCampReport')
vi.mock('@/hooks/usePermission')

function mockPermission(canViewReport = true) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => codes.includes('camp:manage') && canViewReport,
  } as unknown as ReturnType<typeof usePermission>)
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

describe('CampOverviewSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders total, status, type, and billing-type counts from a real report', () => {
    mockPermission(true)
    vi.mocked(useCampReport).mockReturnValue({
      data: reportFixture(), isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    render(<CampOverviewSection />)

    expect(screen.getByText('Camp overview')).toBeInTheDocument()
    expect(screen.getByText('Current operational distribution')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('Total camps')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getAllByText('8').length).toBeGreaterThan(0) // live count and diet count coincide
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByText('Billable')).toBeInTheDocument()
    // No trend/forecast machinery survives the swap.
    expect(screen.queryByText(/projected|forecast|ytd|full-year/i)).not.toBeInTheDocument()
  })

  it('renders sensibly with an all-zero report (new/empty tenant)', () => {
    mockPermission(true)
    vi.mocked(useCampReport).mockReturnValue({
      data: {
        success: true,
        message: '',
        data: {
          summary: { totalCamps: 0 },
          byStatus: [
            { status: 'requested' as const, count: 0 },
            { status: 'confirmed' as const, count: 0 },
            { status: 'live' as const, count: 0 },
            { status: 'closed' as const, count: 0 },
            { status: 'cancelled' as const, count: 0 },
            { status: 'cancelled_charged' as const, count: 0 },
          ],
          byType: [
            { type: 'screening' as const, count: 0 },
            { type: 'diet' as const, count: 0 },
            { type: 'lab' as const, count: 0 },
          ],
          byBillingType: [
            { billingType: 'billable' as const, count: 0 },
            { billingType: 'void' as const, count: 0 },
          ],
        },
      },
      isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    render(<CampOverviewSection />)

    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('shows its own loading state while useCampReport is pending, independent of any Dashboard-level flag', () => {
    mockPermission(true)
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: true, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    render(<CampOverviewSection />)

    expect(screen.getByText(/loading camp overview/i)).toBeInTheDocument()
    expect(screen.queryByText('Total camps')).not.toBeInTheDocument()
  })

  it('shows its own error state with a working Retry that calls refetch', async () => {
    mockPermission(true)
    const refetch = vi.fn()
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: true, refetch,
    } as unknown as ReturnType<typeof useCampReport>)

    const user = userEvent.setup()
    render(<CampOverviewSection />)

    expect(screen.getByText(/failed to load camp overview/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('gates its own fetch on camp:manage/tenant:manage independently of the caller', () => {
    mockPermission(false)
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    render(<CampOverviewSection />)

    expect(useCampReport).toHaveBeenCalledWith(false)
  })
})
