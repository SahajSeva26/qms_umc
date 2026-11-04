import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import RequireEmployeeAccess from './RequireEmployeeAccess'

vi.mock('@/hooks/usePermission')

function mockPermission(overrides: Partial<ReturnType<typeof usePermission>> = {}) {
  vi.mocked(usePermission).mockReturnValue({
    session: null,
    permissions: [],
    isSettled: true,
    isFetching: false,
    isError: false,
    isConfirmedUnauthenticated: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePermission>)
}

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin/employees']}>
      <Routes>
        <Route path="/admin/employees" element={<RequireEmployeeAccess><div>Protected content</div></RequireEmployeeAccess>} />
        <Route path="/auth/login" element={<div>Login page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireEmployeeAccess', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders nothing while the session has not settled yet', () => {
    mockPermission({ isSettled: false })
    const { container } = renderGuard()
    expect(container).toBeEmptyDOMElement()
  })

  it('redirects to login on a confirmed 401', async () => {
    mockPermission({ isConfirmedUnauthenticated: true })
    renderGuard()
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('shows the session-recovery retry UI on an inconclusive session error (not a confirmed 401)', async () => {
    mockPermission({ isError: true, session: null })
    renderGuard()
    expect(await screen.findByText(/couldn't confirm your session/i)).toBeInTheDocument()
  })

  it('redirects to /unauthorized for a role type outside the allow-list', async () => {
    mockPermission({ session: { roleType: { code: 'sales-rep' } } as never, permissions: [] })
    renderGuard()
    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument()
  })

  it.each(['admin', 'operation-manager-screening', 'operation-manager-diet', 'field-officer'])(
    'renders children for the allowed role type %s',
    async (code) => {
      mockPermission({ session: { roleType: { code } } as never, permissions: [] })
      renderGuard()
      expect(await screen.findByText('Protected content')).toBeInTheDocument()
    },
  )

  it('system:manage bypasses the role-type check entirely', async () => {
    mockPermission({ session: { roleType: { code: 'sales-rep' } } as never, permissions: ['system:manage'] })
    renderGuard()
    expect(await screen.findByText('Protected content')).toBeInTheDocument()
  })
})
