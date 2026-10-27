import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaMyTeamTab from './PharmaMyTeamTab'
import { useSession } from '@/hooks/useSession'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

vi.mock('@/hooks/useSession')

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchDownlineMrs: vi.fn(),
    searchRoles: vi.fn(),
    searchRoleTypes: vi.fn(),
  },
}))

function mockSession(roleTypeCode: string) {
  vi.mocked(useSession).mockReturnValue({
    session: {
      user: { id: 'u-1' },
      role: { id: 'self-role-1', code: roleTypeCode, division: 'div-1' },
      roleType: { id: 'rt-1', code: roleTypeCode },
      tenant: { id: 't-1', name: 'Tenant' },
      permissions: [],
    },
  } as unknown as ReturnType<typeof useSession>)
}

function role(id: string, code: string, firstName: string) {
  return { id, code, name: `${firstName} role`, type: null, user: { _id: `u-${id}`, firstName, lastName: 'Rep', email: `${firstName}@x.com` }, tenant: 't-1' }
}

function roleType(id: string, code: string) {
  return { id, code, name: code, status: 'active' }
}

function paginated(items: unknown[]) {
  return { success: true, message: '', data: { items, count: items.length } }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaMyTeamTab />
    </QueryClientProvider>,
  )
}

describe('PharmaMyTeamTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('ASM: shows a card grid of direct MRs via GET /roles/mrs', async () => {
    mockSession('pharma-asm')
    vi.mocked(accessManagementService.searchDownlineMrs).mockResolvedValue(
      paginated([role('mr-1', 'phr-1', 'Asha'), role('mr-2', 'phr-2', 'Beena')]) as never,
    )

    renderTab()

    expect(await screen.findByText('Asha Rep')).toBeInTheDocument()
    expect(screen.getByText('Beena Rep')).toBeInTheDocument()
    expect(screen.getByText(/2 MRs reporting to you/i)).toBeInTheDocument()
  })

  it('ASM: shows the empty state when there are no direct MRs', async () => {
    mockSession('pharma-asm')
    vi.mocked(accessManagementService.searchDownlineMrs).mockResolvedValue(paginated([]) as never)

    renderTab()

    expect(await screen.findByText(/no mrs reporting to you yet/i)).toBeInTheDocument()
  })

  it('RSM: shows its ASMs, and expanding one fetches that ASM\'s MRs', async () => {
    mockSession('pharma-rsm')
    vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (query: unknown) => {
      const code = (query as { code: string }).code
      return paginated([roleType(`rt-${code}`, code)]) as never
    })
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (query: unknown) => {
      const { supervisor, type } = query as { supervisor?: string; type?: string }
      if (supervisor === 'self-role-1' && type === 'rt-pharma-asm') return paginated([role('asm-1', 'phr-asm-1', 'Chitra')]) as never
      if (supervisor === 'asm-1' && type === 'rt-pharma-mr') return paginated([role('mr-1', 'phr-mr-1', 'Deepa')]) as never
      return paginated([]) as never
    })

    renderTab()

    expect(await screen.findByText('Chitra Rep')).toBeInTheDocument()
    expect(screen.queryByText('Deepa Rep')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('Chitra Rep'))

    expect(await screen.findByText('Deepa Rep')).toBeInTheDocument()
  })

  it('HO: shows its RSMs, and expanding one fetches that RSM\'s ASMs', async () => {
    mockSession('pharma-division-head')
    vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (query: unknown) => {
      const code = (query as { code: string }).code
      return paginated([roleType(`rt-${code}`, code)]) as never
    })
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (query: unknown) => {
      const { supervisor, type } = query as { supervisor?: string; type?: string }
      if (supervisor === 'self-role-1' && type === 'rt-pharma-rsm') return paginated([role('rsm-1', 'phr-rsm-1', 'Esha')]) as never
      if (supervisor === 'rsm-1' && type === 'rt-pharma-asm') return paginated([role('asm-1', 'phr-asm-1', 'Farah')]) as never
      return paginated([]) as never
    })

    renderTab()

    expect(await screen.findByText('Esha Rep')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Esha Rep'))

    expect(await screen.findByText('Farah Rep')).toBeInTheDocument()
  })

  it('renders a graceful message for a role not covered by any hierarchy level', () => {
    mockSession('pharma-mr')

    renderTab()

    expect(screen.getByText(/isn't available for your role/i)).toBeInTheDocument()
  })
})
