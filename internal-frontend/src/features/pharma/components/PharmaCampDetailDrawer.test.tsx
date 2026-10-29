import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import PharmaCampDetailDrawer from './PharmaCampDetailDrawer'
import { useSession } from '@/hooks/useSession'
import type { CampEntity } from '@/types/campReal.types'
import type { RatingEntity } from '@qms/core'

vi.mock('@/hooks/useSession')
vi.mock('@/lib/api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    dietitian: null,
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

function ratingFixture(overrides: Partial<RatingEntity> = {}): RatingEntity {
  return {
    id: 'rating-1', camp: null, worker: null,
    ratedBy: { id: 'mr-1', name: 'Amit Desai', code: 'mr-001' },
    tenant: null, onTime: 5, attire: 4, communication: 4, overall: 4.3,
    ratedAt: '2026-09-21T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...overrides,
  }
}

function mockSession(roleId: string | null, permissions: string[] = ['rating:search', 'rating:create']) {
  vi.mocked(useSession).mockReturnValue({
    session: roleId ? { user: { id: 'u-1' }, role: { id: roleId, code: 'pharma-mr', division: 'div-1' }, roleType: { code: 'pharma-mr' }, tenant: { id: 't-1', name: 'Tenant' } } : null,
    hasAnyPermission: (codes: string[]) => codes.some((c) => permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderDrawer(camp: CampEntity) {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaCampDetailDrawer camp={camp} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('PharmaCampDetailDrawer', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { items: [], count: 0 } } })
    mockSession(null)
  })

  it('labels the staffing row "Field Officer" and shows the FO name for a screening camp', () => {
    renderDrawer(campFixture())

    expect(screen.getByText('Field Officer')).toBeInTheDocument()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.queryByText('Dietitian')).not.toBeInTheDocument()
  })

  it('a diet camp labels the staffing row "Dietitian" and shows the dietitian name, not a stale FO', () => {
    renderDrawer(
      campFixture({ type: 'diet', fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' }, dietitian: { _id: 'diet-1', code: 'diet-001', name: 'Anita Rao' } }),
    )

    expect(screen.getByText('Dietitian')).toBeInTheDocument()
    expect(screen.getByText('Anita Rao')).toBeInTheDocument()
    expect(screen.queryByText('Field Officer')).not.toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('a diet camp with no dietitian shows "Not yet assigned", even with a stale camp.fo present', () => {
    renderDrawer(campFixture({ type: 'diet', fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' }, dietitian: null }))

    expect(screen.getByText('Dietitian')).toBeInTheDocument()
    expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('shows the camp type as a pill alongside status', () => {
    renderDrawer(campFixture({ type: 'lab' }))

    expect(screen.getByText('Lab')).toBeInTheDocument()
  })

  it('renders real patient stats (not just patientExpectation) when the backend has supplied camp.stats', () => {
    renderDrawer(campFixture({ patientExpectation: 40, stats: { patients: 35, patientsCompleted: 20 } }))

    expect(screen.getByText('20 / 35')).toBeInTheDocument()
  })

  it('falls back to patientExpectation when camp.stats is absent', () => {
    renderDrawer(campFixture({ patientExpectation: 40, stats: undefined }))

    expect(screen.getByText('0 / 40')).toBeInTheDocument()
  })

  it('shows a non-faked "Coming soon" for Rx count/feedback — there is no backing data model for these yet', () => {
    renderDrawer(campFixture())

    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
  })

  it('renders the stage history audit trail', () => {
    renderDrawer(
      campFixture({
        stageHistory: [{ from: 'requested', to: 'confirmed', reason: 'Slot locked', actor: { name: 'Amit Desai' }, createdAt: '2026-09-11T10:00:00.000Z' }],
      }),
    )

    expect(screen.getByText('Stage history')).toBeInTheDocument()
    expect(screen.getByText('confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Amit Desai/)).toBeInTheDocument()
  })

  describe('FO / camp rating section', () => {
    it('shows no rating section for a camp that is neither closed nor rated', () => {
      renderDrawer(campFixture({ status: 'confirmed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(screen.queryByText('FO / camp rating')).not.toBeInTheDocument()
    })

    it('shows a "Rate camp" action for the camp\'s own MR once the camp is closed and unrated', async () => {
      mockSession('mr-1')
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(await screen.findByRole('button', { name: /rate camp/i })).toBeInTheDocument()
    })

    it('does not show a "Rate camp" action for an MR who does not own this camp', () => {
      mockSession('someone-else')
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(screen.queryByText('FO / camp rating')).not.toBeInTheDocument()
    })

    it('shows the existing rating read-only plus an "Edit rating" action when the owning MR holds rating:update', async () => {
      const api = (await import('@/lib/api/api')).default
      vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { items: [ratingFixture()], count: 1 } } })
      mockSession('mr-1', ['rating:search', 'rating:create', 'rating:update'])
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(await screen.findByText('Overall')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit rating/i })).toBeInTheDocument()
    })

    // Edit is gated on rating:update, never rating:create — the owning MR holding only create
    // (not update) must NOT see an Edit action, even though they could create a first rating.
    it('does NOT show "Edit rating" to the owning MR when they hold rating:create but not rating:update', async () => {
      const api = (await import('@/lib/api/api')).default
      vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { items: [ratingFixture()], count: 1 } } })
      mockSession('mr-1', ['rating:search', 'rating:create'])
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(await screen.findByText('Overall')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit rating/i })).not.toBeInTheDocument()
    })

    it('shows the existing rating read-only with no edit action to a non-owning viewer', async () => {
      const api = (await import('@/lib/api/api')).default
      vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { items: [ratingFixture()], count: 1 } } })
      mockSession('someone-else')
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(await screen.findByText('Overall')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit rating/i })).not.toBeInTheDocument()
    })

    it('renders no FO / camp rating section at all for a viewer with no rating:* permission — and never calls GET /ratings', async () => {
      mockSession('mr-1', [])
      const api = (await import('@/lib/api/api')).default
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(screen.queryByText('FO / camp rating')).not.toBeInTheDocument()
      expect(api.get).not.toHaveBeenCalledWith('/ratings', expect.anything())
    })

    // GET /ratings (search) is guarded by rating:search OR rating:manage — NOT rating:get, which
    // only covers the different GET /ratings/:id route.
    it('renders no FO / camp rating section for a viewer holding only rating:get — never calls GET /ratings', async () => {
      mockSession('mr-1', ['rating:get'])
      const api = (await import('@/lib/api/api')).default
      renderDrawer(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

      expect(screen.queryByText('FO / camp rating')).not.toBeInTheDocument()
      expect(api.get).not.toHaveBeenCalledWith('/ratings', expect.anything())
    })
  })
})
