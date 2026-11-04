import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { startOfWeek, addDays, dayKey } from '@/utils/calendarDate'

// Regression for two P1 findings:
// 1. "next week" must be bounded by BOTH dateFrom and dateTo — an open-ended dateFrom could match
//    a plan for a week further in the future instead of the exact Monday-Sunday window.
// 2. Dates must be built with a local-timezone-safe formatter (dayKey), not
//    toISOString().slice(0, 10), which shifts by a day in IST (UTC+5:30).
vi.mock('@/features/crm/weeklyPlan/weeklyPlanReal.service', () => ({
  weeklyPlanRealService: {
    searchWeeklyPlans: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getRole: vi.fn(async () => ({ success: true, message: '', data: null })),
  },
}))
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: { role: { id: 'role-rep-1' } } }),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('WeeklyPlanMyPlanCard — exact-week query window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void accessManagementService
  })

  it('queries exactly next Monday through next Sunday, not an open-ended "from next week onward" range', async () => {
    const WeeklyPlanMyPlanCard = (await import('./WeeklyPlanMyPlanCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanMyPlanCard />
      </QueryClientProvider>,
    )

    await screen.findByText('Next-week plan')

    const expectedStart = startOfWeek(addDays(new Date(), 7))
    const expectedEnd = addDays(expectedStart, 6)

    expect(weeklyPlanRealService.searchWeeklyPlans).toHaveBeenCalledWith(
      expect.objectContaining({
        salesPerson: 'role-rep-1',
        dateFrom: dayKey(expectedStart),
        dateTo: dayKey(expectedEnd),
      }),
    )
  })
})

// Regression: approving a plan previously showed only the status pill, no acknowledgement.
describe('WeeklyPlanMyPlanCard — approved acknowledgement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void accessManagementService
  })

  it('shows an approved acknowledgement with the approver and reason from stageHistory', async () => {
    vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'plan-1',
            startDate: '2026-11-09T00:00:00.000Z',
            endDate: '2026-11-15T00:00:00.000Z',
            salesPerson: { id: 'role-rep-1', code: 'rep-1', name: 'Rep One' },
            status: 'approved',
            plans: [],
            stageHistory: [
              { from: 'pending', to: 'approved', reason: 'Looks good', actor: { name: 'Rajiv Menon' }, createdAt: '2026-11-02T12:00:00.000Z' },
            ],
            createdAt: '',
            updatedAt: '',
          },
        ],
        count: 1,
      },
    } as never)

    const WeeklyPlanMyPlanCard = (await import('./WeeklyPlanMyPlanCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanMyPlanCard />
      </QueryClientProvider>,
    )

    await screen.findByText(/Rajiv Menon/)
    expect(screen.getByText(/Looks good/)).toBeInTheDocument()
  })

  it('shows an approved acknowledgement even with no matching stageHistory entry', async () => {
    vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'plan-2',
            startDate: '2026-11-09T00:00:00.000Z',
            endDate: '2026-11-15T00:00:00.000Z',
            salesPerson: { id: 'role-rep-1', code: 'rep-1', name: 'Rep One' },
            status: 'approved',
            plans: [],
            stageHistory: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
        count: 1,
      },
    } as never)

    const WeeklyPlanMyPlanCard = (await import('./WeeklyPlanMyPlanCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanMyPlanCard />
      </QueryClientProvider>,
    )

    expect(await screen.findAllByText('Approved')).toHaveLength(2)
  })
})
