import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyTeamTab from './MyTeamTab'
import type { EligibleMr } from '@/features/pharma'

const { searchDownlineMrs } = vi.hoisted(() => ({
  searchDownlineMrs: vi.fn(async (): Promise<{ success: boolean; message: string; data: { items: EligibleMr[]; count: number } }> =>
    ({ success: true, message: '', data: { items: [], count: 0 } })),
}))

vi.mock('@/features/pharma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/pharma')>()
  return { ...actual, searchDownlineMrs }
})

function mrFixture(overrides: Partial<EligibleMr> = {}): EligibleMr {
  return {
    id: 'mr-1', code: 'SUN-MR-1001',
    // A real role.name is never the display name in practice — the backend always sets it to a
    // placeholder, most visibly for bulk-imported MRs ("pharma-mr role for Priya"). Fixture
    // matches that reality so a test asserting on the real user name (not this field) is
    // meaningful, not accidentally passing because the fixture used a real-looking name here too.
    name: 'pharma-mr role for mr-1',
    user: { _id: 'u-1', firstName: 'Suresh', lastName: 'Patil', email: 's.patil@example.com' },
    division: { _id: 'div-1', name: 'Cardio Care', code: 'CARDIO' },
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MyTeamTab />
    </QueryClientProvider>,
  )
}

describe('MyTeamTab — ASM\'s direct-report MRs, via the already-safe GET /roles/mrs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the real MR name (the populated user, not role.name), role label + code, and division', async () => {
    searchDownlineMrs.mockResolvedValue({ success: true, message: '', data: { items: [mrFixture()], count: 1 } })
    renderTab()

    expect(await screen.findByText('Suresh Patil')).toBeInTheDocument()
    expect(screen.queryByText(/pharma-mr role for/i)).not.toBeInTheDocument()
    expect(screen.getByText('MR · SUN-MR-1001')).toBeInTheDocument()
    expect(screen.getByText('Cardio Care')).toBeInTheDocument()
  })

  it('falls back to role.name when the user isn\'t populated (never shown blank)', async () => {
    searchDownlineMrs.mockResolvedValue({
      success: true, message: '', data: { items: [mrFixture({ name: 'pharma-mr role for Priya', user: undefined })], count: 1 },
    })
    renderTab()

    expect(await screen.findByText('pharma-mr role for Priya')).toBeInTheDocument()
  })

  it('never renders a city chip, camp-count pills, or a serviceability banner — that data doesn\'t exist in our backend yet', async () => {
    searchDownlineMrs.mockResolvedValue({ success: true, message: '', data: { items: [mrFixture()], count: 1 } })
    renderTab()

    await screen.findByText('Suresh Patil')
    expect(screen.queryByText(/serviceable/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/screening ·/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/camps$/i)).not.toBeInTheDocument()
  })

  it('shows the real reporting-count header text, pluralized correctly', async () => {
    searchDownlineMrs.mockResolvedValue({
      success: true, message: '', data: { items: [mrFixture(), mrFixture({ id: 'mr-2', name: 'Rakesh Iyer' })], count: 2 },
    })
    renderTab()

    expect(await screen.findByText('2 MRs reporting to you')).toBeInTheDocument()
  })

  it('pluralizes correctly for exactly one MR', async () => {
    searchDownlineMrs.mockResolvedValue({ success: true, message: '', data: { items: [mrFixture()], count: 1 } })
    renderTab()

    expect(await screen.findByText('1 MR reporting to you')).toBeInTheDocument()
  })

  it('shows a team-shaped skeleton (not plain loading text) before the first response resolves', async () => {
    searchDownlineMrs.mockReturnValue(new Promise(() => {}))
    renderTab()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading your team/i)).not.toBeInTheDocument()
  })

  it('shows the error state with Retry on failure', async () => {
    searchDownlineMrs.mockRejectedValueOnce(new Error('network error'))
    renderTab()

    expect(await screen.findByText(/failed to load your team/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows the empty state when the ASM has no direct reports', async () => {
    searchDownlineMrs.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    renderTab()

    expect(await screen.findByText(/no mrs reporting to you yet/i)).toBeInTheDocument()
  })

  it('requests page 2 after clicking Next, keeping the page size at 20', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => mrFixture({ id: `mr-${i}`, name: `MR Number ${i}`, user: undefined, code: `SUN-MR-${1000 + i}` }))
    searchDownlineMrs.mockResolvedValue({ success: true, message: '', data: { items: page1, count: 25 } })
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('MR Number 0')
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(searchDownlineMrs).toHaveBeenCalledWith(expect.objectContaining({ page: '2', limit: '20' }))
  })
})
