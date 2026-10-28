import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { SessionResponse } from '@qms/core'

vi.mock('@/hooks/useSession')

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: roleTypeCode, name: 'Role', division: 'div-1' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function mockSession(session: SessionResponse | null) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({ session } as unknown as ReturnType<typeof useSession>)
}

async function renderSidebar() {
  const Sidebar = (await import('./Sidebar')).default
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar — pharma-frontend shell nav', () => {
  it('shows a link to the session role\'s own portal — MR', async () => {
    await mockSession(sessionFixture('pharma-mr'))
    await renderSidebar()

    const link = screen.getByRole('link', { name: /mr portal/i })
    expect(link).toHaveAttribute('href', '/pharma/mr')
  })

  it('shows a link to the session role\'s own portal — HO', async () => {
    await mockSession(sessionFixture('pharma-division-head'))
    await renderSidebar()

    const link = screen.getByRole('link', { name: /ho portal/i })
    expect(link).toHaveAttribute('href', '/pharma/ho')
  })

  it('renders no nav link for an unrecognized role-type code', async () => {
    await mockSession(sessionFixture('sales-rep'))
    await renderSidebar()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders no nav link before the session resolves', async () => {
    await mockSession(null)
    await renderSidebar()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
