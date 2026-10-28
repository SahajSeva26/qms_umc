import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import CampDossierContent from './CampDossierContent'
import { useSession } from '@/hooks/useSession'
import type { CampEntity } from '@/types/campReal.types'
import type { RatingEntity } from '@/types/rating.types'

vi.mock('@/hooks/useSession')

const { searchRatings } = vi.hoisted(() => ({
  searchRatings: vi.fn(async (): Promise<{ success: boolean; message: string; data: { items: RatingEntity[]; count: number } }> =>
    ({ success: true, message: '', data: { items: [], count: 0 } })),
}))

vi.mock('@/features/rating/rating.service', () => ({
  ratingService: { searchRatings, myRatings: vi.fn(), getRating: vi.fn(), createRating: vi.fn(), updateRating: vi.fn() },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000123',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: { _id: 'proj-1', name: 'Q1 Cardio Screening' },
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta', pharmaCode: 'SUN-CP-01', specialization: 'cardiologist' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    dietitian: null,
    mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' }, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

function mockSession(roleId: string | null) {
  vi.mocked(useSession).mockReturnValue({
    session: roleId ? { user: { id: 'u-1' }, role: { id: roleId, code: 'pharma-mr', division: 'div-1' }, roleType: { code: 'pharma-mr' }, tenant: { id: 't-1', name: 'Tenant' } } : null,
  } as unknown as ReturnType<typeof useSession>)
}

function renderContent(camp: CampEntity) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CampDossierContent camp={camp} />
    </QueryClientProvider>,
  )
}

describe('CampDossierContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchRatings.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession(null)
  })

  it('renders the pharma-visible section order: Camp details, Doctor details, MR details, FO/Dietitian, Camp photos, Patients section', () => {
    renderContent(campFixture())

    const sectionTitles = ['Camp details', 'Doctor details', 'MR details', 'FO / Dietitian', 'Camp photos', 'Patients · results · interpretation']
    sectionTitles.forEach((t) => expect(screen.getByText(t)).toBeInTheDocument())
  })

  it('shows the PHARMA VIEW · PII REDACTED badge in the header', () => {
    renderContent(campFixture())

    expect(screen.getByText(/PHARMA VIEW/)).toBeInTheDocument()
  })

  it('never shows an internal-only section the backend has no concept of (camp coordinator)', () => {
    renderContent(campFixture())

    expect(screen.queryByText(/coordinator/i)).not.toBeInTheDocument()
  })

  it('omits the Doctor details card entirely when the camp has no doctor (not an empty card)', () => {
    renderContent(campFixture({ doctor: null as unknown as CampEntity['doctor'] }))

    expect(screen.queryByText('Doctor details')).not.toBeInTheDocument()
  })

  it('labels the worker card "FO / Dietitian" and shows the FO for a screening camp', () => {
    renderContent(campFixture({ type: 'screening', fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' } }))

    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('Field Officer')).toBeInTheDocument()
  })

  it('shows the dietitian, not a stale FO, for a diet camp', () => {
    renderContent(campFixture({
      type: 'diet',
      fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
      dietitian: { _id: 'diet-1', code: 'diet-001', name: 'Anita Rao' },
    }))

    expect(screen.getByText('Anita Rao')).toBeInTheDocument()
    expect(screen.getByText('Dietitian')).toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('shows the honest "coming together" placeholder for patient results, not fabricated rows', () => {
    renderContent(campFixture())

    expect(screen.getByText(/coming together/i)).toBeInTheDocument()
  })

  it('renders no FO / camp rating card for a camp that is neither closed nor rated', () => {
    renderContent(campFixture({ status: 'requested' }))

    expect(screen.queryByText('FO / camp rating')).not.toBeInTheDocument()
  })

  it('shows a "Rate camp" action inside the dossier for the camp\'s own MR once closed', async () => {
    mockSession('mr-1')
    renderContent(campFixture({ status: 'closed', mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' } }))

    expect(await screen.findByRole('button', { name: /rate camp/i })).toBeInTheDocument()
  })
})
