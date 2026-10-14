import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import PharmaDoctorsTab from './PharmaDoctorsTab'
import { useSession } from '@/hooks/useSession'

vi.mock('@/hooks/useSession')

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockSession(permissions: string[]) {
  vi.mocked(useSession).mockReturnValue({
    session: { user: { id: 'u-1' }, role: { id: 'role-1', code: 'pharma-mr', division: 'div-1' }, roleType: { code: 'pharma-mr' }, tenant: { id: 't-1', name: 'Tenant' }, permissions },
    permissions,
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => permissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
}

function renderTab() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaDoctorsTab />
    </QueryClientProvider>,
  )
}

describe('PharmaDoctorsTab — New doctor gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides "New doctor" with neither doctor:create nor doctor:manage', () => {
    mockSession([])
    renderTab()

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('shows "New doctor" for a session holding only doctor:create — the configured default for new pharma-mr role types', () => {
    mockSession(['doctor:create'])
    renderTab()

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })

  it('shows "New doctor" with doctor:manage too', () => {
    mockSession(['doctor:manage'])
    renderTab()

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })
})
