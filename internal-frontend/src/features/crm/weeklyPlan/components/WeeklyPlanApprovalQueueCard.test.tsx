import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'

// No supervisor scoping on the backend yet — weekly-plan:manage sees every pending plan, org-wide.
vi.mock('@/features/crm/weeklyPlan/weeklyPlanReal.service', () => ({
  weeklyPlanRealService: {
    searchWeeklyPlans: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('WeeklyPlanApprovalQueueCard — queue scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries all pending plans org-wide, with no supervisor filter', async () => {
    const WeeklyPlanApprovalQueueCard = (await import('./WeeklyPlanApprovalQueueCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanApprovalQueueCard />
      </QueryClientProvider>,
    )

    await screen.findByText('Weekly plans to approve')

    expect(weeklyPlanRealService.searchWeeklyPlans).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    )
    const [callArgs] = vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mock.calls[0]
    expect(callArgs).not.toHaveProperty('supervisor')
  })
})

describe('WeeklyPlanApprovalQueueCard — reason required on every stage change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks Approve/Reject until a reason is typed, matching the backend\'s reason: z.string().min(1)', async () => {
    vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'plan-1',
            startDate: '2026-08-03T00:00:00.000Z',
            endDate: '2026-08-09T00:00:00.000Z',
            salesPerson: { name: 'Rep One' },
            status: 'pending',
            plans: [],
            stageHistory: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
        count: 1,
      },
    } as never)

    const user = userEvent.setup()
    const WeeklyPlanApprovalQueueCard = (await import('./WeeklyPlanApprovalQueueCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanApprovalQueueCard />
      </QueryClientProvider>,
    )

    const approveButton = await screen.findByRole('button', { name: /approve/i })
    fireEvent.click(approveButton)

    // First click opens the reason field — Approve stays disabled until something is typed.
    const reasonInput = await screen.findByPlaceholderText(/reason for approving/i)
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled()

    await user.type(reasonInput, 'Looks good')
    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled()
  })
})

// Regression: the approver previously had no way to see each visit's detail before deciding.
describe('WeeklyPlanApprovalQueueCard — plan detail before deciding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reveals each visit\'s detail when "View visits" is clicked, and hides it again on toggle', async () => {
    vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'plan-1',
            startDate: '2026-11-09T00:00:00.000Z',
            endDate: '2026-11-15T00:00:00.000Z',
            salesPerson: { name: 'Rohit Malhotra' },
            status: 'pending',
            plans: [
              {
                id: 'visit-1',
                tenant: { name: 'Cipla', code: 'clt-1' },
                division: { name: 'Cardiology', code: 'div-1' },
                contactPerson: { name: 'Dr. Mehta', designation: 'Chief Cardiologist' },
                agenda: { public: 'Discuss Q4 renewal' },
                date: '2026-11-10T09:00:00.000Z',
              },
            ],
            stageHistory: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
        count: 1,
      },
    } as never)

    const WeeklyPlanApprovalQueueCard = (await import('./WeeklyPlanApprovalQueueCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanApprovalQueueCard />
      </QueryClientProvider>,
    )

    await screen.findByText('Rohit Malhotra')
    expect(screen.queryByText(/Cipla/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view visits/i }))

    expect(await screen.findByText(/Cipla/)).toBeInTheDocument()
    expect(screen.getByText(/Cardiology/)).toBeInTheDocument()
    expect(screen.getByText(/Dr\. Mehta/)).toBeInTheDocument()
    expect(screen.getByText('Discuss Q4 renewal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide visits/i }))
    expect(screen.queryByText(/Cipla/)).not.toBeInTheDocument()
  })

  it('shows the populated lead/invoice code, title, and status when the visit links one', async () => {
    vi.mocked(weeklyPlanRealService.searchWeeklyPlans).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'plan-2',
            startDate: '2026-11-09T00:00:00.000Z',
            endDate: '2026-11-15T00:00:00.000Z',
            salesPerson: { name: 'Rohit Malhotra' },
            status: 'pending',
            plans: [
              {
                id: 'visit-2',
                tenant: { name: 'Sun Pharma', code: 'clt-2' },
                division: { name: 'Oncology', code: 'div-2' },
                contactPerson: { name: 'Dr. Rao' },
                lead: { code: 'lead-0042', title: 'New screening camp pitch', status: 'open' },
                invoice: { code: 'inv-00012', status: 'issued' },
                date: '2026-11-11T09:00:00.000Z',
              },
            ],
            stageHistory: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
        count: 1,
      },
    } as never)

    const WeeklyPlanApprovalQueueCard = (await import('./WeeklyPlanApprovalQueueCard')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <WeeklyPlanApprovalQueueCard />
      </QueryClientProvider>,
    )

    await screen.findByText('Rohit Malhotra')
    fireEvent.click(screen.getByRole('button', { name: /view visits/i }))

    expect(await screen.findByText('lead-0042')).toBeInTheDocument()
    expect(screen.getByText(/New screening camp pitch/)).toBeInTheDocument()
    expect(screen.getByText(/open/)).toBeInTheDocument()
    expect(screen.getByText('inv-00012')).toBeInTheDocument()
    expect(screen.getByText(/issued/)).toBeInTheDocument()
  })
})
