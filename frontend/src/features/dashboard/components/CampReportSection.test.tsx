import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { useCampMonthlyReportData } from '@/features/dashboard/hooks/useCampMonthlyReport'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/dashboard/hooks/useCampMonthlyReport')

function mockPermission(canView: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => canView && (codes.includes('camp:manage') || codes.includes('tenant:manage')),
  } as unknown as ReturnType<typeof usePermission>)
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CampReportSection — permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useCampMonthlyReportData).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampMonthlyReportData>)
  })

  it('renders for a caller with camp:manage/tenant:manage', async () => {
    mockPermission(true)
    const CampReportSection = (await import('./CampReportSection')).default
    renderWithQueryClient(<CampReportSection />)
    expect(screen.getByText('Camp report — Screening, Diet & Lab')).toBeInTheDocument()
  })

  it('renders nothing for a caller lacking camp:manage/tenant:manage', async () => {
    mockPermission(false)
    const CampReportSection = (await import('./CampReportSection')).default
    const { container } = renderWithQueryClient(<CampReportSection />)
    expect(container).toBeEmptyDOMElement()
  })
})
