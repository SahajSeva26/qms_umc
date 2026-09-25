import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DivisionDetailPage from './DivisionDetailPage'
import { useDivision } from '@/features/crm/divisions/hooks/useDivision'
import type { DivisionEntity } from '@/types/crm.types'

vi.mock('@/features/crm/divisions/hooks/useDivision')

vi.mock('@/features/crm/divisions/components/DivisionMrsSection', () => ({
  default: () => <div>MrsSection stub</div>,
}))
vi.mock('@/features/crm/brands/components/DivisionBrandsSection', () => ({
  default: () => <div>BrandsSection stub</div>,
}))
vi.mock('@/features/crm/divisions/components/DivisionContactsSection', () => ({
  default: () => <div>ContactsSection stub</div>,
}))
vi.mock('@/features/crm/divisions/components/DivisionDoctorsSection', () => ({
  default: ({ tenantId, divisionId }: { tenantId: string; divisionId: string }) => (
    <div>DoctorsSection stub for {tenantId}/{divisionId}</div>
  ),
}))
vi.mock('@/features/crm/divisions/components/EditDivisionModal', () => ({
  default: () => null,
}))

function divisionFixture(overrides: Partial<DivisionEntity> = {}): DivisionEntity {
  return {
    id: 'd-1',
    code: 'DIV-1',
    name: 'Cardiology Division',
    therapy: ['cardiology'] as never,
    mrCount: 0,
    tenant: { _id: 't-1', name: 'Acme Pharma', code: 'acme' } as never,
    createdAt: '',
    updatedAt: '',
    status: 'active',
    ...overrides,
  }
}

function renderPage() {
  vi.mocked(useDivision).mockReturnValue({
    data: { success: true, message: '', data: divisionFixture() },
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useDivision>)

  return render(
    <MemoryRouter initialEntries={['/crm/divisions/d-1']}>
      <Routes>
        <Route path="/crm/divisions/:id" element={<DivisionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DivisionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the MRs tab by default, unchanged', () => {
    renderPage()
    expect(screen.getByText('MrsSection stub')).toBeInTheDocument()
  })

  it('the tab strip includes Doctors alongside MRs/Brands/Contacts', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'MRs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brands' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contacts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Doctors' })).toBeInTheDocument()
  })

  it('switching to the Doctors tab renders DivisionDoctorsSection scoped to this tenant+division', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Doctors' }))

    await waitFor(() => expect(screen.getByText(/DoctorsSection stub for t-1\/d-1/)).toBeInTheDocument())
    expect(screen.queryByText('MrsSection stub')).not.toBeInTheDocument()
  })

  it('switching between all four tabs still works (MRs/Brands/Contacts unchanged)', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Brands' }))
    await waitFor(() => expect(screen.getByText('BrandsSection stub')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    await waitFor(() => expect(screen.getByText('ContactsSection stub')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'MRs' }))
    await waitFor(() => expect(screen.getByText('MrsSection stub')).toBeInTheDocument())
  })
})
