import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useMySalesSweep } from '@/features/crm/hooks/useMySalesSweep'
import type { LeadEntity } from '@/types/crm.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/hooks/useLeads')
vi.mock('@/features/crm/hooks/useLeadReport')
vi.mock('@/features/crm/hooks/useMySalesSweep')

function mockPermission(canManageLeads: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => (canManageLeads ? codes.some((c) => c === 'lead:manage' || c === 'tenant:manage') : false),
  } as unknown as ReturnType<typeof usePermission>)
}

// For scenarios where lead:manage and tenant:manage diverge — e.g. a tenant:manage-only caller,
// who can see every lead (canManageLeads) but still can't call /leads/report (lead:manage only).
function mockGrantedPermissions(granted: string[]) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => codes.some((c) => granted.includes(c)),
  } as unknown as ReturnType<typeof usePermission>)
}

function mockLeads() {
  vi.mocked(useLeads).mockReturnValue({
    leads: [],
    count: 0,
    isLoading: false,
    error: null,
    moveStage: vi.fn(),
    updateLead: vi.fn(),
    createLead: vi.fn(),
    isMovingStage: false,
    isUpdating: false,
    isCreating: false,
  } as unknown as ReturnType<typeof useLeads>)
}

function mockMySweep(partial: Partial<ReturnType<typeof useMySalesSweep>>) {
  vi.mocked(useMySalesSweep).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...partial,
  } as unknown as ReturnType<typeof useMySalesSweep>)
}

function leadFixture(overrides: Partial<LeadEntity>): LeadEntity {
  return {
    id: 'l1',
    code: 'ld-000001',
    tenant: 't1',
    division: 'd1',
    contactPerson: 'c1',
    salesPerson: 's1',
    focusTherapy: [],
    focusTherapyDoctor: [],
    title: 'Lead',
    problemStatement: '',
    numberOfMRS: 1,
    currentlyDoing: [],
    projectType: 'screening',
    offers: [],
    estimatedValue: 0,
    confidence: 50,
    status: 'new',
    stageHistory: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  } as LeadEntity
}

function reportFixture() {
  return {
    summary: { totalLeads: 120, converted: 40, lost: 15, open: 65 },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-08-01', to: '2026-09-01', data: [] } },
    kpis: { pipelineValue: 0, wonValue: 0, wonCount: 0, avgDealSize: 0, winRate: 0, salesVelocityDays: 0, topRep: null },
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const CrmPage = (await import('./CrmPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <CrmPage />
    </QueryClientProvider>,
  )
}

describe('CrmPage — Lead KPI strip permission/loading/error branching', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockMySweep({}) // irrelevant for manager-path tests, which gate it off via `enabled: false`
  })

  it('never enables the report query for a non-manager, and instead drives My Sales Dashboard from an own-scoped sweep', async () => {
    mockPermission(false)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockMySweep({ data: [] })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, false)
    expect(useMySalesSweep).toHaveBeenCalledWith(true)
    expect(screen.getByText('My Sales Dashboard · current portfolio')).toBeInTheDocument()
    expect(screen.getByText('You have no leads yet.')).toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
    expect(screen.queryByText('All lead statistics')).not.toBeInTheDocument()
  }, 15000) // first test in the file also pays for CrmPage's dynamic import — slow under full-suite load

  it('shows a loading skeleton while the report is in flight for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, true)
    expect(useMySalesSweep).toHaveBeenCalledWith(false)
    expect(screen.queryByText('Statistics are available to lead managers.')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
  })

  it('shows an inline error message when the report fails to load for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: true, error: new Error('boom'), refetch: vi.fn() })

    await renderPage()

    expect(screen.getByText("Couldn't load stats.")).toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
  })

  it('offers a manual Retry action that calls the hook\'s refetch, since the report never auto-retries', async () => {
    mockPermission(true)
    const refetch = vi.fn()
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: true, error: new Error('boom'), refetch })

    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders the real tenant-wide KPI strip with its scope label once the report resolves for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, isError: false, error: null, refetch: vi.fn() })

    await renderPage()

    expect(screen.getByText('All lead statistics')).toBeInTheDocument()
    expect(screen.getByText('Open Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Won leads')).toBeInTheDocument()
    expect(screen.getByText('Lost leads')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })
})

describe('CrmPage — My Sales Dashboard (KAM/Sales Rep own-scope path)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
    mockPermission(false)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
  })

  it('shows a loading skeleton while the own-scoped sweep is in flight', async () => {
    mockMySweep({ isLoading: true })

    await renderPage()

    expect(screen.queryByText('My Sales Dashboard · current portfolio')).not.toBeInTheDocument()
    expect(screen.queryByText('My Leads')).not.toBeInTheDocument()
  })

  it('shows an inline error with a Retry action when the sweep fails, never a partial/mixed KPI render', async () => {
    const refetch = vi.fn()
    mockMySweep({ isError: true, error: new Error('boom'), refetch })

    await renderPage()

    expect(screen.getByText("Couldn't load your sales dashboard.")).toBeInTheDocument()
    expect(screen.queryByText('My Leads')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('derives all 8 confirmed own-scope KPI tiles (incl. velocity from stageHistory) from the swept leads, with no top-rep/targets fabrication', async () => {
    mockMySweep({
      data: [
        leadFixture({ id: 'l1', status: 'won', estimatedValue: 100_000 }),
        leadFixture({ id: 'l2', status: 'won', estimatedValue: 50_000 }),
        leadFixture({ id: 'l3', status: 'lost', estimatedValue: 20_000 }),
        leadFixture({ id: 'l4', status: 'qualified', estimatedValue: 30_000 }),
      ],
    })

    await renderPage()

    expect(screen.getByText('My Sales Dashboard · current portfolio')).toBeInTheDocument()
    expect(screen.getByText('My Leads')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument() // total

    expect(screen.getByText('Open Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Open Pipeline Value')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Won Deal Size')).toBeInTheDocument()
    expect(screen.getByText('Sales Velocity (days)')).toBeInTheDocument()
  })

  it('shows an empty-portfolio message instead of a zeroed-out KPI strip when the caller has no leads', async () => {
    mockMySweep({ data: [] })

    await renderPage()

    expect(screen.getByText('You have no leads yet.')).toBeInTheDocument()
    expect(screen.queryByText('My Leads')).not.toBeInTheDocument()
  })

  it('hides the Top Reps leaderboard for a non-manager, since it would only ever rank their own single row', async () => {
    mockMySweep({ data: [] })

    await renderPage()

    expect(screen.queryByText('Top Reps · Won value')).not.toBeInTheDocument()
  })
})

describe('CrmPage — tenant:manage-only callers must not hit the lead:manage-gated /leads/report endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLeads()
  })

  it('a tenant:manage (but not lead:manage) caller gets full lead visibility/mutation, but still falls into the own-scope My Sales Dashboard instead of calling the report endpoint', async () => {
    mockGrantedPermissions(['tenant:manage'])
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() })
    mockMySweep({ data: [leadFixture({ status: 'won', estimatedValue: 10_000 })] })

    await renderPage()

    // canManageLeads (tenant:manage) still grants full lead mutation UI...
    expect(screen.getByRole('button', { name: /New Lead/i })).toBeInTheDocument()
    // ...but /leads/report is lead:manage-only at the route level, so it must never be enabled here.
    expect(useLeadReport).toHaveBeenCalledWith({}, false)
    expect(useMySalesSweep).toHaveBeenCalledWith(true)
    expect(screen.getByText('My Sales Dashboard · current portfolio')).toBeInTheDocument()
    expect(screen.queryByText('All lead statistics')).not.toBeInTheDocument()
  })
})
