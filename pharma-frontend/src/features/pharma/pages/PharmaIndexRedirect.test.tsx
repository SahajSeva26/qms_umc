import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
    session: null,
    ...overrides,
  } as unknown as ReturnType<typeof useSession>)
}

async function renderAtIndex() {
  const PharmaIndexRedirect = (await import('./PharmaIndexRedirect')).default
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<PharmaIndexRedirect />} />
        <Route path="/pharma/mr" element={<div>MR landing</div>} />
        <Route path="/pharma/ho" element={<div>HO landing</div>} />
        <Route path="/pharma/rsm" element={<div>RSM landing</div>} />
        <Route path="/pharma/asm" element={<div>ASM landing</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PharmaIndexRedirect — role-based landing', () => {
  it('shows a loading state before the session has settled, never redirecting prematurely', async () => {
    await mockSession({ isSettled: false, session: null })
    await renderAtIndex()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('MR landing')).not.toBeInTheDocument()
  })

  it('redirects an MR session to /pharma/mr', async () => {
    await mockSession({ session: sessionFixture('pharma-mr') })
    await renderAtIndex()

    expect(await screen.findByText('MR landing')).toBeInTheDocument()
  })

  it('redirects an HO session to /pharma/ho', async () => {
    await mockSession({ session: sessionFixture('pharma-division-head') })
    await renderAtIndex()

    expect(await screen.findByText('HO landing')).toBeInTheDocument()
  })

  it('redirects an RSM session to /pharma/rsm', async () => {
    await mockSession({ session: sessionFixture('pharma-rsm') })
    await renderAtIndex()

    expect(await screen.findByText('RSM landing')).toBeInTheDocument()
  })

  it('redirects an ASM session to /pharma/asm', async () => {
    await mockSession({ session: sessionFixture('pharma-asm') })
    await renderAtIndex()

    expect(await screen.findByText('ASM landing')).toBeInTheDocument()
  })

  it('falls back to /pharma/mr for a non-pharma or unrecognized role-type code', async () => {
    await mockSession({ session: sessionFixture('sales-rep') })
    await renderAtIndex()

    expect(await screen.findByText('MR landing')).toBeInTheDocument()
  })
})
