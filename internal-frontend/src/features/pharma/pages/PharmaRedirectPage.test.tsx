import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

async function renderAt(path: string) {
  const PharmaRedirectPage = (await import('@/features/pharma/pages/PharmaRedirectPage')).default
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pharma" element={<PharmaRedirectPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PharmaRedirectPage', () => {
  const originalLocation = window.location

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('renders nothing decisive while the session has not settled yet', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: false,
      isConfirmedUnauthenticated: false,
      session: null,
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma')

    expect(screen.queryByText('HO Portal')).not.toBeInTheDocument()
    expect(screen.queryByText('Unauthorized Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when confirmed unauthenticated', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: true,
      session: null,
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma')

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it.each([
    ['pharma-division-head', '/pharma/ho'],
    ['pharma-rsm', '/pharma/rsm'],
    ['pharma-asm', '/pharma/asm'],
    ['pharma-mr', '/pharma/mr'],
  ])('cross-origin redirects role type %s to pharma-frontend\'s own portal path (not an in-app route)', async (roleTypeCode, expectedPath) => {
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, set href(v: string) { hrefSpy(v) } },
      writable: true,
      configurable: true,
    })

    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture(roleTypeCode),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma')

    await waitFor(() => expect(hrefSpy).toHaveBeenCalledWith(`http://localhost:5174${expectedPath}`))
  })

  it('redirects a non-pharma role to /unauthorized, never attempting a cross-origin navigation', async () => {
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, set href(v: string) { hrefSpy(v) } },
      writable: true,
      configurable: true,
    })

    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true,
      isConfirmedUnauthenticated: false,
      session: sessionFixture('sales-rep'),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma')

    expect(await screen.findByText('Unauthorized Page')).toBeInTheDocument()
    expect(hrefSpy).not.toHaveBeenCalled()
  })
})
