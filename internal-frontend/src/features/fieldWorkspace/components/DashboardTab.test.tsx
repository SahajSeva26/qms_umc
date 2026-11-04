import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import DashboardTab from './DashboardTab'
import { useSession } from '@/hooks/useSession'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import { useMyInventoryAssignments } from '@/features/fieldWorkspace/hooks/useMyInventoryAssignments'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')
vi.mock('@/features/fieldWorkspace/hooks/useMyCamps')
vi.mock('@/features/fieldWorkspace/hooks/useMyInventoryAssignments')

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1',
    code: 'cmp-000001',
    tenant: { code: 'clt-1', name: 'Cipla' },
    division: { code: 'div-1', name: 'Cardio' },
    project: null,
    doctor: { name: 'Dr. Mehta' },
    type: 'screening',
    billingType: 'billable',
    patientExpectation: 0,
    fo: null,
    dietitian: null,
    mr: null,
    asm: null,
    rsm: null,
    date: new Date().toISOString().slice(0, 10),
    timeSlot: null,
    location: { addressLine1: '', city: 'Pune', state: 'MH', pincode: '' },
    devices: [],
    meta: null,
    status: 'confirmed',
    stageHistory: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function render_() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <DashboardTab />
    </QueryClientProvider>,
  )
}

// Regression: the Dashboard's 6 KPI tiles must each reflect only real backend data — Reports to
// Upload / Pending Claims / Open SOS / Attendance Today are deliberately not shown (no backend
// support for any of them, confirmed during this feature's research pass).
describe('DashboardTab — KPI derivation', () => {
  it('counts pending-closure camps as past-dated, non-terminal-status camps', async () => {
    vi.mocked(useSession).mockReturnValue({ session: { role: { id: 'r-1' } } } as unknown as ReturnType<typeof useSession>)
    vi.mocked(useMyCamps).mockReturnValue({
      data: {
        data: {
          items: [
            campFixture({ id: 'c1', date: '2020-01-01', status: 'confirmed' }), // pending closure
            campFixture({ id: 'c2', date: '2020-01-01', status: 'closed' }), // not pending — terminal
          ],
          count: 2,
          summary: { totalCamps: 2, statusCounts: [], typeCounts: [] },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMyCamps>)
    vi.mocked(useMyInventoryAssignments).mockReturnValue({
      data: { data: { items: [], count: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMyInventoryAssignments>)

    render_()

    expect(await screen.findByText('1 camp need closure reports')).toBeInTheDocument()
  })

  it('never shows an alert banner when nothing is pending closure', async () => {
    vi.mocked(useSession).mockReturnValue({ session: { role: { id: 'r-1' } } } as unknown as ReturnType<typeof useSession>)
    vi.mocked(useMyCamps).mockReturnValue({
      data: { data: { items: [], count: 0, summary: { totalCamps: 0, statusCounts: [], typeCounts: [] } } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMyCamps>)
    vi.mocked(useMyInventoryAssignments).mockReturnValue({
      data: { data: { items: [], count: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMyInventoryAssignments>)

    render_()

    expect(await screen.findByText('Command centre · today + upcoming + open issues + KPIs')).toBeInTheDocument()
    expect(screen.queryByText(/need closure reports/)).not.toBeInTheDocument()
  })
})
