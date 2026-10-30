import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

async function mockSession(overrides: Partial<ReturnType<typeof import('@/hooks/useSession').useSession>>) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    isSettled: true,
    isConfirmedUnauthenticated: false,
    session: null,
    ...overrides,
  } as unknown as ReturnType<typeof useSession>)
}

async function renderGate(roleTypeCode: string | string[]) {
  const PharmaRoleGate = (await import('./PharmaRoleGate')).default
  return render(
    <PharmaRoleGate roleTypeCode={roleTypeCode}>
      <div>Gated content</div>
    </PharmaRoleGate>,
  )
}

describe('PharmaRoleGate — direct-route authorization', () => {
  it('renders children when the session role matches the single required code', async () => {
    await mockSession({ session: sessionFixture('pharma-division-head') })
    await renderGate('pharma-division-head')

    expect(await screen.findByText('Gated content')).toBeInTheDocument()
  })

  it('blocks a direct hit from a DIFFERENT role — e.g. an MR session opening the HO path directly', async () => {
    await mockSession({ session: sessionFixture('pharma-mr') })
    await renderGate('pharma-division-head')

    expect(await screen.findByText("Not available for your role")).toBeInTheDocument()
    expect(screen.queryByText('Gated content')).not.toBeInTheDocument()
  })

  it('accepts an array of allowed codes — used by routes shared across roles', async () => {
    await mockSession({ session: sessionFixture('pharma-rsm') })
    await renderGate(['pharma-rsm', 'pharma-asm'])

    expect(await screen.findByText('Gated content')).toBeInTheDocument()
  })

  it('blocks a role not present in the allowed-codes array', async () => {
    await mockSession({ session: sessionFixture('pharma-mr') })
    await renderGate(['pharma-rsm', 'pharma-asm'])

    expect(await screen.findByText("Not available for your role")).toBeInTheDocument()
    expect(screen.queryByText('Gated content')).not.toBeInTheDocument()
  })

  it('shows a loading state before the session has settled, never a premature role-mismatch message', async () => {
    await mockSession({ isSettled: false, session: null })
    await renderGate('pharma-division-head')

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText("Not available for your role")).not.toBeInTheDocument()
  })

  it('renders nothing (defers to the redirect effect) when confirmed unauthenticated', async () => {
    await mockSession({ isConfirmedUnauthenticated: true, session: null })
    const { container } = await renderGate('pharma-division-head')

    expect(container).toBeEmptyDOMElement()
  })
})
