import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionResponse } from '@qms/core'
import PharmaDashboardPortalPage from './PharmaDashboardPortalPage'

vi.mock('@/hooks/useSession')
vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    searchScopedCamps: vi.fn().mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } }),
  },
}))
// Full-weight (RHF + Zod + Maps SDK) — this file only needs to prove the tab mounts it with
// needsMrPicker, not exercise the real booking form (BookCampForm.test.tsx owns that).
vi.mock('@/features/pharma/components/MrBookCampTab', () => ({
  default: ({ needsMrPicker }: { needsMrPicker?: boolean }) => <div>Book-on-behalf tab mounted · needsMrPicker: {String(!!needsMrPicker)}</div>,
}))

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: roleTypeCode, name: 'Role', division: 'div-1' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: [],
  } as unknown as SessionResponse
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage(sessionRoleTypeCode: string, gateRoleTypeCode = 'pharma-asm') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(sessionRoleTypeCode),
    isSettled: true,
    isConfirmedUnauthenticated: false,
    hasAnyPermission: () => false,
  } as unknown as ReturnType<typeof useSession>)

  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaDashboardPortalPage roleTypeCode={gateRoleTypeCode} portalLabel="ASM" />
    </QueryClientProvider>,
  )
}

describe('PharmaDashboardPortalPage — shared HO/RSM/ASM shell', () => {
  it('shows Dashboard by default and switches to the real Camp Schedule tab on click', async () => {
    const user = userEvent.setup()
    await renderPage('pharma-asm', 'pharma-asm')

    expect(screen.getByRole('button', { name: /^Dashboard$/ })).toBeInTheDocument()
    const scheduleTabButton = screen.getByRole('button', { name: /^Camp schedule$/ })
    await user.click(scheduleTabButton)

    expect(await screen.findByText(/no camps in this status yet/i)).toBeInTheDocument()
  })

  it('blocks a role not matching roleTypeCode (cross-role deep link)', async () => {
    await renderPage('pharma-mr', 'pharma-asm')

    expect(await screen.findByText(/not available for your role/i)).toBeInTheDocument()
  })

  it('switches to the "Book on behalf of MR" tab and mounts MrBookCampTab with needsMrPicker=true', async () => {
    const user = userEvent.setup()
    await renderPage('pharma-asm', 'pharma-asm')

    const bookTabButton = screen.getByRole('button', { name: /^Book on behalf of MR$/ })
    await user.click(bookTabButton)

    expect(await screen.findByText(/book-on-behalf tab mounted · needsMrPicker: true/i)).toBeInTheDocument()
  })
})
