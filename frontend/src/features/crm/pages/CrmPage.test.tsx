import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/hooks/useLeads')
vi.mock('@/features/crm/hooks/useLeadReport')

function mockPermission(canManageLeads: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => (canManageLeads ? codes.some((c) => c === 'lead:manage' || c === 'tenant:manage') : false),
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

function reportFixture() {
  return {
    summary: { totalLeads: 120, converted: 40, lost: 15, open: 65 },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-08-01', to: '2026-09-01', data: [] } },
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
  })

  it('never enables the report query and shows the non-manager message when lacking lead:manage/tenant:manage', async () => {
    mockPermission(false)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, error: null })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, false)
    expect(screen.getByText('Statistics are available to lead managers.')).toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
    expect(screen.queryByText('All lead statistics')).not.toBeInTheDocument()
  }, 15000) // first test in the file also pays for CrmPage's dynamic import — slow under full-suite load

  it('shows a loading skeleton while the report is in flight for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: true, error: null })

    await renderPage()

    expect(useLeadReport).toHaveBeenCalledWith({}, true)
    expect(screen.queryByText('Statistics are available to lead managers.')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
  })

  it('shows an inline error message when the report fails to load for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: undefined, isLoading: false, error: new Error('boom') })

    await renderPage()

    expect(screen.getByText("Couldn't load stats.")).toBeInTheDocument()
    expect(screen.queryByText('Open Opportunities')).not.toBeInTheDocument()
  })

  it('renders the real tenant-wide KPI strip with its scope label once the report resolves for a manager', async () => {
    mockPermission(true)
    vi.mocked(useLeadReport).mockReturnValue({ report: reportFixture(), isLoading: false, error: null })

    await renderPage()

    expect(screen.getByText('All lead statistics')).toBeInTheDocument()
    expect(screen.getByText('Open Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Won leads')).toBeInTheDocument()
    expect(screen.getByText('Lost leads')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })
})
