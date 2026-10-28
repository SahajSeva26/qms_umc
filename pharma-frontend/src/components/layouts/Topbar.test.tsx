import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionResponse } from '@qms/core'

vi.mock('@/hooks/useSession')
vi.mock('@/features/auth/auth.service', () => ({
  authService: { logout: vi.fn() },
}))

const MOBILE_MENU_TOGGLE_ID = 'mobile-menu-toggle'
const MOBILE_SIDEBAR_ID = 'mobile-sidebar'

function sessionFixture(): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'Riya', lastName: 'Shah' },
    role: { id: 'role-1', code: 'pharma-mr', name: 'MR', division: 'div-1' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'Medical Representative' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function mockSession(session: SessionResponse | null) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({ session } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } })
}

async function renderTopbar(opts?: { onMobileMenuToggle?: () => void; mobileMenuOpen?: boolean }) {
  const Topbar = (await import('./Topbar')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <Topbar
        mobileMenuOpen={opts?.mobileMenuOpen ?? false}
        onMobileMenuToggle={opts?.onMobileMenuToggle ?? vi.fn()}
        mobileMenuToggleId={MOBILE_MENU_TOGGLE_ID}
        mobileSidebarId={MOBILE_SIDEBAR_ID}
      />
    </QueryClientProvider>,
  )
}

describe('Topbar — pharma-frontend shell header', () => {
  it('shows the greeting with the session user\'s first name and their role label', async () => {
    await mockSession(sessionFixture())
    await renderTopbar()

    expect(screen.getByText(/good (morning|afternoon|evening), Riya/i)).toBeInTheDocument()
    expect(screen.getByText('Medical Representative')).toBeInTheDocument()
    expect(screen.getByText('Riya Shah')).toBeInTheDocument()
  })

  it('falls back gracefully before the session resolves', async () => {
    await mockSession(null)
    await renderTopbar()

    expect(screen.getByText(/there/i)).toBeInTheDocument()
  })

  it('clicking the hamburger calls onMobileMenuToggle', async () => {
    await mockSession(sessionFixture())
    const onToggle = vi.fn()
    const user = userEvent.setup()
    await renderTopbar({ onMobileMenuToggle: onToggle })

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('the hamburger button carries aria-expanded/aria-controls that track the open mobile menu', async () => {
    await mockSession(sessionFixture())
    const { rerender } = await renderTopbar({ mobileMenuOpen: false })

    const closedButton = screen.getByRole('button', { name: /open menu/i })
    expect(closedButton).toHaveAttribute('aria-expanded', 'false')
    expect(closedButton).toHaveAttribute('aria-controls', MOBILE_SIDEBAR_ID)
    expect(closedButton).toHaveAttribute('id', MOBILE_MENU_TOGGLE_ID)

    const Topbar = (await import('./Topbar')).default
    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <Topbar
          mobileMenuOpen
          onMobileMenuToggle={vi.fn()}
          mobileMenuToggleId={MOBILE_MENU_TOGGLE_ID}
          mobileSidebarId={MOBILE_SIDEBAR_ID}
        />
      </QueryClientProvider>,
    )

    const openButton = screen.getByRole('button', { name: /close menu/i })
    expect(openButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens the user menu and shows Sign out, with aria-expanded/aria-haspopup on the trigger', async () => {
    await mockSession(sessionFixture())
    const user = userEvent.setup()
    await renderTopbar()

    const trigger = screen.getByRole('button', { name: /open account menu/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.getByText('a@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close account menu/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('Escape closes the open user menu', async () => {
    await mockSession(sessionFixture())
    const user = userEvent.setup()
    await renderTopbar()

    await user.click(screen.getByText('Riya Shah'))
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('on success: awaits logout, THEN redirects — never the reverse order', async () => {
    const { authService } = await import('@/features/auth/auth.service')
    let resolveLogout!: () => void
    vi.mocked(authService.logout).mockReturnValue(
      new Promise((resolve) => { resolveLogout = () => resolve({ success: true, message: '', data: null }) }),
    )
    const originalHref = window.location.href
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSpy(v) } },
      writable: true,
    })

    await mockSession(sessionFixture())
    const user = userEvent.setup()
    await renderTopbar()
    await user.click(screen.getByText('Riya Shah'))
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    // Disabled + "Signing out…" while the logout call is still in flight — the redirect must not
    // have fired yet.
    expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled()
    expect(hrefSpy).not.toHaveBeenCalled()

    resolveLogout()
    await waitFor(() => expect(hrefSpy).toHaveBeenCalledTimes(1))
    expect(hrefSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/login'))

    Object.defineProperty(window, 'location', { value: { ...window.location, href: originalHref }, writable: true })
  })

  it('on failure: shows a visible, retryable error, re-enables the button, and never redirects', async () => {
    const { authService } = await import('@/features/auth/auth.service')
    vi.mocked(authService.logout).mockRejectedValueOnce(new Error('network error'))
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSpy(v) } },
      writable: true,
    })

    await mockSession(sessionFixture())
    const user = userEvent.setup()
    await renderTopbar()
    await user.click(screen.getByText('Riya Shah'))
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign out failed/i)
    expect(screen.getByRole('button', { name: /^sign out$/i })).not.toBeDisabled()
    expect(hrefSpy).not.toHaveBeenCalled()
  })

  it('retrying after a failure clears the previous error', async () => {
    const { authService } = await import('@/features/auth/auth.service')
    vi.mocked(authService.logout).mockRejectedValueOnce(new Error('network error'))
    vi.mocked(authService.logout).mockResolvedValueOnce({ success: true, message: '', data: null })
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSpy(v) } },
      writable: true,
    })

    await mockSession(sessionFixture())
    const user = userEvent.setup()
    await renderTopbar()
    await user.click(screen.getByText('Riya Shah'))
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^sign out$/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(hrefSpy).toHaveBeenCalledTimes(1))
  })
})
