import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { CampEntity, CampPopulatedRole } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')
vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: { getCamp: vi.fn() },
}))
vi.mock('@/features/clinical/screening/screening.service', () => ({
  screeningService: {
    searchScreenings: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getScreening: vi.fn(),
    createScreening: vi.fn(),
    updateScreening: vi.fn(),
    moveScreeningStage: vi.fn(),
  },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  const fo: CampPopulatedRole = { _id: 'r-fo', code: 'fo-001', name: 'Field Officer One', status: 'active' }
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo, mr: null, date: '2026-09-15', timeSlot: '9am-1pm', city: 'Pune', state: 'Maharashtra',
    coordinates: [73.8567, 18.5204], devices: [], status: 'live', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

async function mockSession(roleId: string, permissions: string[], roleTypeCode = 'field-officer') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: roleId, code: 'fo', name: 'FO' }, roleType: { id: 'rt-1', code: roleTypeCode, name: 'Field Officer' }, tenant: { id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }, permissions },
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isAuthenticated: true, isConfirmedUnauthenticated: false,
    hasPermission: (c: string) => permissions.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => permissions.includes(c)),
    hasAllPermissions: (cs: string[]) => cs.every((c) => permissions.includes(c)),
    refetchSession: vi.fn(), clearSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage(camp: CampEntity) {
  const { campsRealService } = await import('@/features/camps/campsReal.service')
  vi.mocked(campsRealService.getCamp).mockResolvedValue({ success: true, message: '', data: camp })

  const CampScreeningPage = (await import('./CampScreeningPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/camps/${camp.id}/screening`]}>
        <Routes>
          <Route path="/camps/:id/screening" element={<CampScreeningPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampScreeningPage — gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks a non-assigned Field Officer with a clear message, showing no screening list', async () => {
    await mockSession('r-someone-else', ['screening:create', 'screening:get', 'screening:search', 'screening:update'])
    await renderPage(campFixture())

    expect(await screen.findByText(/only the field officer assigned to this camp/i, {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.queryByText(/no screenings yet/i)).not.toBeInTheDocument()
  }, 15000)

  it('allows the camp\'s assigned Field Officer through to the screening list', async () => {
    await mockSession('r-fo', ['screening:create', 'screening:get', 'screening:search', 'screening:update'])
    await renderPage(campFixture())

    expect(await screen.findByText(/no screenings yet/i, {}, { timeout: 10000 })).toBeInTheDocument()
  }, 15000)

  it('allows a screening:manage holder through regardless of camp.fo', async () => {
    await mockSession('r-someone-else', ['screening:manage'])
    await renderPage(campFixture())

    expect(await screen.findByText(/no screenings yet/i, {}, { timeout: 10000 })).toBeInTheDocument()
  }, 15000)

  it('blocks a matching role id whose roleType is not field-officer — id equality alone must never be enough', async () => {
    // Same role id as camp.fo ('r-fo'), but a non-FO roleType — mirrors the
    // backend's assertAssignedFoOrManage, which requires isFoType AND
    // isAssigned together, not id equality alone (see canRunScreening).
    await mockSession('r-fo', ['screening:create', 'screening:get', 'screening:search', 'screening:update'], 'sales-rep')
    await renderPage(campFixture())

    expect(await screen.findByText(/only the field officer assigned to this camp/i, {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.queryByText(/no screenings yet/i)).not.toBeInTheDocument()
  }, 15000)

  it('shows a not-live message, not the screening list, for a non-live camp', async () => {
    await mockSession('r-fo', ['screening:create', 'screening:get', 'screening:search', 'screening:update'])
    await renderPage(campFixture({ status: 'requested' }))

    expect(await screen.findByText(/this camp is not live/i, {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.queryByText(/no screenings yet/i)).not.toBeInTheDocument()
  }, 15000)
})
