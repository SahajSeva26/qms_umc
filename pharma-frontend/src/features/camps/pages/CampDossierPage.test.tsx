import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@qms/core'
import CampDossierPage from './CampDossierPage'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')
vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: { getCamp: vi.fn() },
}))

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: [],
  } as unknown as SessionResponse
}

function campFixture(): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', project: null, doctor: { _id: 'doc-1', name: 'Dr. A' },
    type: 'screening', patientExpectation: 0, fo: null, dietitian: null, mr: null,
    date: '2026-01-01', timeSlot: null, location: null, status: 'closed',
    stageHistory: [], createdAt: '', updatedAt: '',
  } as CampEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderAt(roleTypeCode: string) {
  const { useSession } = await import('@/hooks/useSession')
  const session = sessionFixture(roleTypeCode)
  vi.mocked(useSession).mockReturnValue({
    session,
    hasAnyPermission: (codes: string[]) => codes.some((c) => session.permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
  vi.mocked(pharmaCampsService.getCamp).mockResolvedValue({ success: true, message: '', data: campFixture() })

  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/pharma/camps/camp-1']}>
        <Routes>
          <Route path="/pharma/camps/:id" element={<CampDossierPage />} />
          <Route path="/pharma/ho" element={<div>HO Portal</div>} />
          <Route path="/pharma/rsm" element={<div>RSM Portal</div>} />
          <Route path="/pharma/asm" element={<div>ASM Portal</div>} />
          <Route path="/pharma/mr" element={<div>MR Portal</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampDossierPage — role-aware back path', () => {
  it.each([
    ['pharma-division-head', '/pharma/ho', 'HO Portal'],
    ['pharma-rsm', '/pharma/rsm', 'RSM Portal'],
    ['pharma-asm', '/pharma/asm', 'ASM Portal'],
    ['pharma-mr', '/pharma/mr', 'MR Portal'],
  ])('"Back to portal" and the breadcrumb send %s to their OWN portal, not MR\'s', async (roleTypeCode, _path, expectedPortalText) => {
    const user = userEvent.setup()
    await renderAt(roleTypeCode)

    await screen.findByText('Camp dossier')
    await user.click(screen.getByRole('button', { name: /back to portal/i }))

    expect(await screen.findByText(expectedPortalText)).toBeInTheDocument()
  })

  it('an HO opening a valid dossier URL is never sent to the MR portal', async () => {
    const user = userEvent.setup()
    await renderAt('pharma-division-head')

    await screen.findByText('Camp dossier')
    await user.click(screen.getByRole('button', { name: /back to portal/i }))

    expect(await screen.findByText('HO Portal')).toBeInTheDocument()
    expect(screen.queryByText('MR Portal')).not.toBeInTheDocument()
  })
})
