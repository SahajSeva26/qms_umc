import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useCampReport } from '@/features/camps/hooks/useCampReport'

vi.mock('@/hooks/usePermission')
vi.mock('@/hooks/useAuth')
vi.mock('@/features/dashboard/hooks/useDashboardData')
vi.mock('@/features/camps/hooks/useCampReport')
// Every section is data-fetching-heavy and irrelevant to this page-level smoke test — stub them
// all so it only exercises that the page assembles without crashing.
vi.mock('@/features/dashboard/components/CampReportSection', () => ({ default: () => <div>CampReportSection stub</div> }))
vi.mock('@/features/dashboard/components/CompanySection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/ProjectsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/FoSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/SalesSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/AccountsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/DoctorsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/PatientsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/TopKpiStrip', () => ({ default: () => null }))

function mockPermission() {
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: () => false,
    hasAnyPermission: () => false,
  } as unknown as ReturnType<typeof usePermission>)
}

// DashboardPage's own screening-count tile query needs a real QueryClient (it's a raw useQuery
// call, not a mocked hook) — hasPermission/hasAnyPermission are mocked to always return false, so
// `enabled` stays false and the query never actually fires.
function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPermission()
    vi.mocked(useAuth).mockReturnValue({ user: { firstName: 'Test' } } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useDashboardData).mockReturnValue({ isLoading: false, error: null } as unknown as ReturnType<typeof useDashboardData>)
    vi.mocked(useCampReport).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useCampReport>)
  })

  it('renders without crashing and mounts CampReportSection unconditionally (the section gates its own visibility)', async () => {
    const DashboardPage = (await import('./DashboardPage')).default
    renderWithQueryClient(<DashboardPage />)
    expect(screen.getByText('CampReportSection stub')).toBeInTheDocument()
  })
})
