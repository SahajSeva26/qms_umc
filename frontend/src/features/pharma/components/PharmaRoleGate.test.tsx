import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function renderGate(roleTypeCode: string) {
  const PharmaRoleGate = (await import('@/features/pharma/components/PharmaRoleGate')).default
  return render(
    <MemoryRouter initialEntries={['/pharma/rsm']}>
      <Routes>
        <Route path="/pharma/rsm" element={<PharmaRoleGate roleTypeCode={roleTypeCode}><div>Protected Content</div></PharmaRoleGate>} />
        <Route path="/pharma/mr" element={<div>MR Portal</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PharmaRoleGate', () => {
  it('renders nothing decisive while the session has not settled yet', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: false,
      isConfirmedUnauthenticated: false,
      session: null,
    } as unknown as ReturnType<typeof useSession>)

    await renderGate('pharma-rsm')

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Not available for your role')).not.toBeInTheDocument()
  })

  it('redirects to /login when confirmed unauthenticated', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: true,
      session: null,
    } as unknown as ReturnType<typeof useSession>)

    await renderGate('pharma-rsm')

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it('renders the protected content when the session role matches the required role type', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture('pharma-rsm'),
    } as unknown as ReturnType<typeof useSession>)

    await renderGate('pharma-rsm')

    expect(await screen.findByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to the session\'s own portal, not the protected content, on a cross-role pharma mismatch', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture('pharma-mr'),
    } as unknown as ReturnType<typeof useSession>)

    await renderGate('pharma-rsm')

    expect(await screen.findByText('MR Portal')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Not available for your role')).not.toBeInTheDocument()
  })

  it('shows a role-mismatch message (not a redirect) when the session is not a real pharma role at all', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture('sales-rep'),
    } as unknown as ReturnType<typeof useSession>)

    await renderGate('pharma-rsm')

    expect(await screen.findByText('Not available for your role')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
