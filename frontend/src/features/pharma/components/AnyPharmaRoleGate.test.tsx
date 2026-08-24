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

async function renderGate() {
  const AnyPharmaRoleGate = (await import('@/features/pharma/components/AnyPharmaRoleGate')).default
  return render(
    <MemoryRouter initialEntries={['/pharma/projects/proj-1/camps']}>
      <Routes>
        <Route path="/pharma/projects/:id/camps" element={<AnyPharmaRoleGate><div>Protected Content</div></AnyPharmaRoleGate>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AnyPharmaRoleGate', () => {
  it('renders nothing decisive while the session has not settled yet', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: false,
      isConfirmedUnauthenticated: false,
      session: null,
    } as unknown as ReturnType<typeof useSession>)

    await renderGate()

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

    await renderGate()

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it.each(['pharma-division-head', 'pharma-rsm', 'pharma-asm', 'pharma-mr'])(
    'renders the protected content for role type %s',
    async (roleTypeCode) => {
      const { useSession } = await import('@/hooks/useSession')
      vi.mocked(useSession).mockReturnValue({
        isSettled: true,
        isConfirmedUnauthenticated: false,
        session: sessionFixture(roleTypeCode),
      } as unknown as ReturnType<typeof useSession>)

      await renderGate()

      expect(await screen.findByText('Protected Content')).toBeInTheDocument()
    },
  )

  it('blocks a camp:book-holding but non-pharma role type — the regression case a plain permission check would miss', async () => {
    const { useSession } = await import('@/hooks/useSession')
    // Holds camp:book (passes a route-level permission check) but isn't
    // one of the 4 recognized pharma role types.
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture('some-other-custom-role'),
    } as unknown as ReturnType<typeof useSession>)

    await renderGate()

    expect(await screen.findByText('Not available for your role')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
