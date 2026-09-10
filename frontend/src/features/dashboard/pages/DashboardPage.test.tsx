import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useSalesDataShared } from '@/hooks/useSalesDataShared'
import { useClientsDataShared } from '@/hooks/useClientsDataShared'

vi.mock('@/hooks/usePermission')
vi.mock('@/hooks/useAuth')
vi.mock('@/features/dashboard/hooks/useDashboardData')
vi.mock('@/hooks/useSalesDataShared')
vi.mock('@/hooks/useClientsDataShared')
vi.mock('@/features/dashboard/components/CampOverviewSection', () => ({
  default: () => <div>CampOverviewSection stub</div>,
}))
// Every other section is data-fetching-heavy and irrelevant to this specific
// gating test — stub them all so this test only exercises the one boolean.
vi.mock('@/features/dashboard/components/CompanySection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/ProjectsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/FoSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/SalesSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/AccountsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/DoctorsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/PatientsSection', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/TopKpiStrip', () => ({ default: () => null }))
vi.mock('@/features/dashboard/components/FilterBar', () => ({ default: () => null }))

function mockPermission(canViewCampReport: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: () => false,
    hasAnyPermission: (codes: string[]) => codes.includes('camp:manage') && canViewCampReport,
  } as unknown as ReturnType<typeof usePermission>)
}

describe('DashboardPage — CampOverviewSection permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: { firstName: 'Test' } } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useDashboardData).mockReturnValue({ isLoading: false, error: null } as unknown as ReturnType<typeof useDashboardData>)
    vi.mocked(useSalesDataShared).mockReturnValue({ reps: [], targets: [] } as unknown as ReturnType<typeof useSalesDataShared>)
    vi.mocked(useClientsDataShared).mockReturnValue({ clients: [], projects: [], invoices: [] } as unknown as ReturnType<typeof useClientsDataShared>)
  })

  it('renders CampOverviewSection for a caller with camp:manage/tenant:manage', async () => {
    mockPermission(true)
    const DashboardPage = (await import('./DashboardPage')).default
    render(<DashboardPage />)
    expect(screen.getByText('CampOverviewSection stub')).toBeInTheDocument()
  })

  it('does not render CampOverviewSection for a caller lacking camp:manage/tenant:manage', async () => {
    mockPermission(false)
    const DashboardPage = (await import('./DashboardPage')).default
    render(<DashboardPage />)
    expect(screen.queryByText('CampOverviewSection stub')).not.toBeInTheDocument()
  })
})
