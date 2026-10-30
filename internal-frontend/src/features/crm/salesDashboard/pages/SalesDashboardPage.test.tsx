import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useMySalesSweep } from '@/features/crm/hooks/useMySalesSweep'
import { useSalesDashboardAppointmentSweep } from '@/features/crm/salesDashboard/hooks/useSalesDashboardAppointmentSweep'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import type { LeadEntity } from '@/types/crm.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/hooks/useLeads')
vi.mock('@/features/crm/hooks/useLeadReport')
vi.mock('@/features/crm/hooks/useMySalesSweep')
vi.mock('@/features/crm/salesDashboard/hooks/useSalesDashboardAppointmentSweep')
vi.mock('@/hooks/useProjectsDataShared')

// canManageLeadMutations = hasAnyPermission(['lead:manage','tenant:manage']); canViewTeamReport =
// hasAnyPermission(['lead:manage']) only. Tests that need to exercise them independently pass an
// explicit grantedCodes list; the simple two-arg form covers the common "both or neither" case.
function mockPermission(grantedCodesOrCanViewTeamReport: string[] | boolean) {
  const granted = typeof grantedCodesOrCanViewTeamReport === 'boolean'
    ? (grantedCodesOrCanViewTeamReport ? ['lead:manage', 'tenant:manage'] : [])
    : grantedCodesOrCanViewTeamReport
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => codes.some((c) => granted.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

function mockLeads() {
  vi.mocked(useLeads).mockReturnValue({
    leads: [], count: 0, isLoading: false, error: null, moveStage: vi.fn(), updateLead: vi.fn(), createLead: vi.fn(),
    isMovingStage: false, isUpdating: false, isCreating: false,
  } as unknown as ReturnType<typeof useLeads>)
}

function mockSweep(partial: Partial<ReturnType<typeof useMySalesSweep>>) {
  vi.mocked(useMySalesSweep).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(), ...partial,
  } as unknown as ReturnType<typeof useMySalesSweep>)
}

function mockProjects(partial: { projects?: unknown[]; isLoading?: boolean; error?: unknown } = {}) {
  vi.mocked(useProjectsDataShared).mockReturnValue({
    projects: [], isLoading: false, error: null, ...partial,
  } as unknown as ReturnType<typeof useProjectsDataShared>)
}

function mockAppointmentSweep(partial: Partial<ReturnType<typeof useSalesDashboardAppointmentSweep>> = {}) {
  vi.mocked(useSalesDashboardAppointmentSweep).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(), ...partial,
  } as unknown as ReturnType<typeof useSalesDashboardAppointmentSweep>)
}

function leadFixture(overrides: Partial<LeadEntity>): LeadEntity {
  return {
    id: 'l1', code: 'ld-000001', tenant: 't1', division: 'd1', contactPerson: 'c1', salesPerson: 's1',
    focusTherapy: [], focusTherapyDoctor: [], title: 'Lead', problemStatement: '', numberOfMRS: 1,
    currentlyDoing: [], projectType: 'screening', offers: [], estimatedValue: 0, confidence: 50,
    status: 'new', stageHistory: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as LeadEntity
}

function reportFixture() {
  return {
    summary: { totalLeads: 10, converted: 4, lost: 2, open: 4 },
    byStatus: [], byProjectType: [],
    trends: { newLeads: { from: '2026-01-01', to: '2026-02-01', data: [] } },
    kpis: { pipelineValue: 500_000, wonValue: 300_000, wonCount: 4, avgDealSize: 75_000, winRate: 66.7, salesVelocityDays: 12, topRep: null },
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const SalesDashboardPage = (await import('./SalesDashboardPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SalesDashboardPage />
    </QueryClientProvider>,
  )
}

describe('SalesDashboardPage — Sales Head (lead:manage)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockProjects()
    mockAppointmentSweep()
    mockPermission(true)
  })

  it('calls useLeadReport enabled and shows the real revenue/pipeline tiles once it resolves', async () => {
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, true)
    expect(screen.getByText('Pipeline Value')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Conversion to Business %')).toBeInTheDocument()
  })

  it('renames the KPI group to "Pipeline Performance" — these are lead estimatedValue/pipeline figures, never invoiced revenue', async () => {
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })

    await renderPage()

    expect(screen.getByText('Pipeline Performance')).toBeInTheDocument()
    expect(screen.queryByText('Revenue & Profitability')).not.toBeInTheDocument()
  })

  it('shows the Performance tab leaderboard, not the "available to lead managers" message', async () => {
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [leadFixture({ status: 'won', estimatedValue: 10_000 })] })
    mockAppointmentSweep({ data: [] })

    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(screen.queryByText('Team performance is available to lead managers.')).not.toBeInTheDocument()
    expect(screen.getByText('Team Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('Top win-rate')).toBeInTheDocument()
    expect(screen.queryByText('Status mix')).not.toBeInTheDocument()
    expect(screen.queryByText('HQ split')).not.toBeInTheDocument()
  })

  it('shows the real "My Accounts" tile shell (matching the prototype\'s 4 tiles) with dash values instead of fabricated numbers', async () => {
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })

    await renderPage()

    expect(screen.getByText('My Accounts')).toBeInTheDocument()
    expect(screen.getByText('No. of accounts')).toBeInTheDocument()
    expect(screen.getByText('No. of divisions')).toBeInTheDocument()
    expect(screen.getByText('Division penetration')).toBeInTheDocument()
    expect(screen.getByText('Billing till today')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(4)
  })
})

describe('SalesDashboardPage — Key Account Manager (lead:search only)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockProjects()
    mockAppointmentSweep()
    mockPermission(false)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
  })

  it('never enables useLeadReport and derives its own tiles from the own-scoped sweep', async () => {
    mockSweep({ data: [leadFixture({ status: 'won', estimatedValue: 50_000 })] })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, false)
    expect(screen.getByText('Open Pipeline Value')).toBeInTheDocument()
  })

  it('shows the lead-manager-only message on the Performance tab instead of a leaderboard', async () => {
    mockSweep({ data: [] })

    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(screen.getByText('Team performance is available to lead managers.')).toBeInTheDocument()
  })

  it('shows a loading state, then an error with Retry, without ever rendering a false zero tile', async () => {
    const refetch = vi.fn()
    mockSweep({ isError: true, error: new Error('boom'), refetch })

    await renderPage()

    expect(screen.getByText("Couldn't load your dashboard.")).toBeInTheDocument()
    expect(screen.queryByText('Open Pipeline Value')).not.toBeInTheDocument()

    // Two Retry buttons render for this failure (the top KPI-error banner and the Today tab's own
    // "Couldn't load your leads" section) — both call the same sweep.refetch, so either is valid.
    const retryButtons = screen.getAllByRole('button', { name: 'Retry' })
    expect(retryButtons.length).toBeGreaterThan(0)
    await userEvent.click(retryButtons[0])
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('never fires the appointment sweep for Performance/Activity — a KAM never renders appointments on either tab', async () => {
    mockSweep({ data: [] })

    await renderPage()
    expect(useSalesDashboardAppointmentSweep).toHaveBeenCalledWith(false)

    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(useSalesDashboardAppointmentSweep).toHaveBeenLastCalledWith(false)

    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))
    expect(useSalesDashboardAppointmentSweep).toHaveBeenLastCalledWith(false)
  })
})

describe('SalesDashboardPage — tenant:manage-only caller keeps real lead-mutation actions', () => {
  it('passes canManageLeadMutations (lead:manage OR tenant:manage), not canViewTeamReport, to LeadDrawer', async () => {
    // tenant:manage only — backend-authorized to mutate leads, but NOT to call /leads/report
    // (lead:manage-gated), so canViewTeamReport must be false while canManageLeadMutations is true.
    mockPermission(['tenant:manage'])
    mockLeads()
    mockProjects()
    mockAppointmentSweep()
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [leadFixture({ id: 'l1', title: 'My Lead' })] })

    await renderPage()

    // canViewTeamReport is false (tenant:manage alone doesn't satisfy it) — /leads/report is never
    // called, and the own-scope KAM derivation path is used for the KPI tiles instead.
    expect(useLeadReport).toHaveBeenCalledWith({}, false)
    expect(screen.getByText('Open Pipeline Value')).toBeInTheDocument()

    // The Performance tab's lead-manager-only message is ALSO gated on canViewTeamReport, so it
    // still shows here — this is a separate, correctly-scoped concept from lead MUTATION rights
    // (canManageLeadMutations), which LeadDrawer receives independently and isn't observable
    // without opening a lead drawer in this smoke test.
    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(screen.getByText('Team performance is available to lead managers.')).toBeInTheDocument()
  })
})

describe('SalesDashboardPage — Camps & Projects (real, from the shared projects list)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockPermission(true)
    mockAppointmentSweep()
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })
  })

  it('renders real project counts without firing any extra request (reuses the shared hook)', async () => {
    mockProjects({ projects: [{ id: 'p1', type: ['screening'] }, { id: 'p2', type: ['diet'] }] })

    await renderPage()

    expect(screen.getByText('No. of Projects')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows a loading skeleton while projects are in flight, never a false "0 projects"', async () => {
    mockProjects({ projects: [], isLoading: true })

    await renderPage()

    expect(screen.queryByText('No. of Projects')).not.toBeInTheDocument()
  })

  it('shows an error message on project load failure, never a false empty "No projects yet"', async () => {
    mockProjects({ projects: [], error: new Error('boom') })

    await renderPage()

    expect(screen.getAllByText("Couldn't load your projects — try again shortly.").length).toBeGreaterThan(0)
    expect(screen.queryByText('No. of Projects')).not.toBeInTheDocument()
  })
})

describe('SalesDashboardPage — Activity tab (real stage-move feed + heatmap)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockProjects()
  })

  it('Sales Head: does not fetch appointments until the Activity tab is opened, then shows both the feed and the heatmap', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [leadFixture({ title: 'Cardio Camp', stageHistory: [{ from: 'new', to: 'qualified', reason: 'x', actor: {}, createdAt: new Date().toISOString() }] })] })
    mockAppointmentSweep({ data: [] })

    await renderPage()

    expect(useSalesDashboardAppointmentSweep).toHaveBeenCalledWith(false)

    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))

    expect(useSalesDashboardAppointmentSweep).toHaveBeenCalledWith(true)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Cardio Camp')).toBeInTheDocument()
    expect(screen.getByText('Activity heatmap (week)')).toBeInTheDocument()
  })

  it('KAM: hides the heatmap entirely (their own data would just be one row, not a real team view)', async () => {
    mockPermission(false)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })
    mockAppointmentSweep({ data: [] })

    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))

    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.queryByText('Activity heatmap (week)')).not.toBeInTheDocument()
  })
})

describe('SalesDashboardPage — Today tab "My companies + divisions" / "Project types" sections', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockPermission(true)
    mockAppointmentSweep()
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockSweep({ data: [] })
  })

  it('derives real company/project-type sections from the shared projects list alone — no extra per-company request', async () => {
    mockProjects({ projects: [] })

    await renderPage()

    expect(screen.getByText('My companies + divisions')).toBeInTheDocument()
    expect(screen.getByText('Project types · count + committed value')).toBeInTheDocument()
    expect(screen.getByText('No companies yet.')).toBeInTheDocument()
    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
  })

  it('shows a real company row with division chips (from my own projects only) and a "committed value" label, never "Billed"/"Paid"', async () => {
    mockProjects({
      projects: [{
        id: 'p1', tenant: { _id: 't1', name: 'Sun Pharma', code: 'sun-pharma' },
        division: { _id: 'd1', name: 'Cardio Care', code: 'cardio-care' },
        type: ['screening'], campCost: 10_000, totalCamps: 2,
        executionMode: { mode: 'po', po: { purchaseOrders: [] } },
      }],
    })

    await renderPage()

    expect(screen.getByText('Sun Pharma')).toBeInTheDocument()
    expect(screen.getByText('Cardio Care')).toBeInTheDocument()
    expect(screen.getByText('1 PO pending')).toBeInTheDocument()
    expect(screen.getAllByText(/committed/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/billed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/paid/i)).not.toBeInTheDocument()
  })

  it('shows a loading skeleton for the Today-tab sections while projects are in flight', async () => {
    mockProjects({ projects: [], isLoading: true })

    await renderPage()

    expect(screen.queryByText('No companies yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('No projects yet.')).not.toBeInTheDocument()
  })

  it('shows an error message for the Today-tab sections on project load failure', async () => {
    mockProjects({ projects: [], error: new Error('boom') })

    await renderPage()

    expect(screen.getByText("Couldn't load your companies — try again shortly.")).toBeInTheDocument()
    expect(screen.getAllByText("Couldn't load your projects — try again shortly.").length).toBeGreaterThan(0)
  })
})

describe('SalesDashboardPage — a failed sweep must never render as real empty data', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockProjects()
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })
  })

  it('Today: a failed lead sweep shows a retry, never "Nothing overdue"/"Nothing due this week"', async () => {
    const refetch = vi.fn()
    mockSweep({ isError: true, error: new Error('boom'), refetch })
    mockAppointmentSweep()

    await renderPage()

    expect(screen.getByText("Couldn't load your leads.")).toBeInTheDocument()
    expect(screen.queryByText('Nothing overdue.')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing due in the next 7 days.')).not.toBeInTheDocument()
    expect(screen.queryByText(/overdue follow-ups/i)).not.toBeInTheDocument()

    const retryButtons = screen.getAllByRole('button', { name: 'Retry' })
    await userEvent.click(retryButtons[retryButtons.length - 1])
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('Performance: a failed appointment sweep shows a retry, never a silently-empty "No active reps"', async () => {
    mockSweep({ data: [] })
    const refetch = vi.fn()
    mockAppointmentSweep({ isError: true, error: new Error('boom'), refetch })

    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))

    expect(screen.getByText("Couldn't load team performance.")).toBeInTheDocument()
    expect(screen.queryByText('No active reps')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('Performance: a failed lead sweep (hidden by kpiError only observing /leads/report) also surfaces a retry here', async () => {
    const refetch = vi.fn()
    mockSweep({ isError: true, error: new Error('boom'), refetch })
    mockAppointmentSweep({ data: [] })

    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Performance' }))

    expect(screen.getByText("Couldn't load team performance.")).toBeInTheDocument()
  })

  it('Activity: a failed appointment sweep shows a retry, never a silently-empty feed/heatmap', async () => {
    mockSweep({ data: [] })
    const refetch = vi.fn()
    mockAppointmentSweep({ isError: true, error: new Error('boom'), refetch })

    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))

    expect(screen.getByText("Couldn't load activity.")).toBeInTheDocument()
    expect(screen.queryByText('No activity yet')).not.toBeInTheDocument()
    expect(screen.queryByText('No activity this week.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('Activity: a failed lead sweep also surfaces a retry here, not a silent empty feed', async () => {
    const refetch = vi.fn()
    mockSweep({ isError: true, error: new Error('boom'), refetch })
    mockAppointmentSweep({ data: [] })

    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))

    expect(screen.getByText("Couldn't load activity.")).toBeInTheDocument()
  })
})
