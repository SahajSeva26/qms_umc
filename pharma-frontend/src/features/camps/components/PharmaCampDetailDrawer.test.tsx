import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionResponse } from '@qms/core'
import type { CampEntity } from '@/types/campReal.types'
import PharmaCampDetailDrawer from './PharmaCampDetailDrawer'

vi.mock('@/hooks/useSession')
vi.mock('@/lib/api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))

beforeEach(async () => {
  vi.clearAllMocks()
  const api = (await import('@/lib/api/api')).default
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { items: [], count: 0 } } })
})

function sessionFixture(roleId: string, permissions: string[] = ['camp:book', 'rating:create', 'rating:search']): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: roleId, code: 'pharma-mr', name: 'MR', division: 'div-1' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions,
  } as unknown as SessionResponse
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'C-1', project: null, doctor: { _id: 'doc-1', name: 'Dr. A' },
    type: 'screening', patientExpectation: 10, fo: null, dietitian: null,
    mr: { _id: 'role-own', code: 'mr-1', name: 'MR One' },
    date: '2026-01-01', timeSlot: null, location: null, status: 'closed',
    stageHistory: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as CampEntity
}

async function renderDrawer(camp: CampEntity, permissions?: string[]) {
  const { useSession } = await import('@/hooks/useSession')
  const session = sessionFixture('role-own', permissions)
  vi.mocked(useSession).mockReturnValue({
    session,
    hasAnyPermission: (codes: string[]) => codes.some((c) => session.permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PharmaCampDetailDrawer camp={camp} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('PharmaCampDetailDrawer — lazy RateCampModal', () => {
  it('opens the lazily-loaded RateCampModal when the camp\'s own MR clicks Rate camp', async () => {
    const user = userEvent.setup()
    await renderDrawer(campFixture())

    const rateButton = await screen.findByRole('button', { name: /rate camp/i })
    await user.click(rateButton)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('PharmaCampDetailDrawer — rating section permission gating (HO/RSM/ASM)', () => {
  it('hides the rating section entirely for a viewer with no rating:* permission, and never calls GET /ratings', async () => {
    const api = (await import('@/lib/api/api')).default

    await renderDrawer(campFixture(), ['camp:book'])

    await screen.findByText('Dr. A')
    expect(screen.queryByText(/camp rating/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rate camp/i })).not.toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/ratings', expect.anything())
  })

  // GET /ratings (search) is guarded by rating:search OR rating:manage — NOT rating:get, which
  // only covers the different GET /ratings/:id route.
  it('hides the rating section for a viewer holding only rating:get — never calls GET /ratings', async () => {
    const api = (await import('@/lib/api/api')).default

    await renderDrawer(campFixture(), ['camp:book', 'rating:get'])

    await screen.findByText('Dr. A')
    expect(screen.queryByText(/camp rating/i)).not.toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/ratings', expect.anything())
  })
})
