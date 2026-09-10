import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampsData } from '@/hooks/useCampsData'
import { useFoClaims, useFoTraining, useFoLeaves } from '@/features/fo/hooks/useFo'
import { useFoRoster } from '@/features/fo/hooks/useFoRoster'
import FoPage from './FoPage'

vi.mock('@/hooks/usePermission')
vi.mock('@/hooks/usePeopleData')
vi.mock('@/hooks/useCampsData')
vi.mock('@/features/fo/hooks/useFo')
vi.mock('@/features/fo/hooks/useFoRoster')
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' } }) }))

function mockPermission(tenantType: 'customer' | 'platform' | undefined) {
  vi.mocked(usePermission).mockReturnValue({
    session: tenantType ? { tenant: { type: tenantType } } : null,
  } as unknown as ReturnType<typeof usePermission>)
}

function mockBaseHooks() {
  vi.mocked(usePeopleData).mockReturnValue({ people: [], devices: [], isLoading: false, error: null } as unknown as ReturnType<typeof usePeopleData>)
  vi.mocked(useCampsData).mockReturnValue({ camps: [], doctors: [], isLoading: false, error: null } as unknown as ReturnType<typeof useCampsData>)
  vi.mocked(useFoClaims).mockReturnValue({ claims: [], isLoading: false, error: null, fileClaim: vi.fn(), decideClaim: vi.fn() } as unknown as ReturnType<typeof useFoClaims>)
  vi.mocked(useFoTraining).mockReturnValue({ training: [], isLoading: false, error: null, markComplete: vi.fn() } as unknown as ReturnType<typeof useFoTraining>)
  vi.mocked(useFoLeaves).mockReturnValue({ leaves: [], isLoading: false, error: null } as unknown as ReturnType<typeof useFoLeaves>)
  vi.mocked(useFoRoster).mockReturnValue({
    fos: [], count: 0, isLoading: false, error: null,
    typeResolvedButMissing: false, geoTruncated: false, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useFoRoster>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/fo']}>
        <Routes>
          <Route path="/fo" element={<FoPage />} />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FoPage — platform-tenant gate (second layer beyond the route\'s permission-only guard)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockBaseHooks()
  })

  it('redirects a customer-tenant session to Unauthorized even though the route-level permission guard already passed', () => {
    mockPermission('customer')

    renderPage()

    expect(screen.getByText('Unauthorized page')).toBeInTheDocument()
    expect(screen.queryByText('FO Management')).not.toBeInTheDocument()
  })

  it('renders normally for a platform-tenant session', () => {
    mockPermission('platform')

    renderPage()

    expect(screen.getByText('FO Management')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized page')).not.toBeInTheDocument()
  })

  it('renders normally while session is not yet settled (no premature redirect before the session resolves)', () => {
    mockPermission(undefined)

    renderPage()

    expect(screen.getByText('FO Management')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized page')).not.toBeInTheDocument()
  })
})
