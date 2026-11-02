import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { divisionService } from '@/features/crm/divisions/division.service'
import { contactsService } from '@/features/contacts/contacts.service'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({
      success: true,
      message: '',
      data: { items: [{ id: 'tenant-1', name: 'Cipla', code: 'clt-1', status: 'active' }], count: 1 },
    })),
  },
}))
vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({
      success: true,
      message: '',
      data: { items: [{ id: 'division-1', name: 'Cardiology', code: 'div-1', status: 'active' }], count: 1 },
    })),
  },
}))
vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    searchContacts: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/billing/invoice.service', () => ({
  invoiceService: {
    searchInvoices: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/crm.service', () => ({
  crmService: { searchLeads: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })) },
}))
vi.mock('@/features/crm/weeklyPlan/hooks/useCreateWeeklyPlan', () => ({
  useCreateWeeklyPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/crm/weeklyPlan/hooks/useUpdateWeeklyPlan', () => ({
  useUpdateWeeklyPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: { role: { id: 'role-rep-1' } }, hasPermission: () => false }),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDialog() {
  const WeeklyPlanFormDialog = (await import('./WeeklyPlanFormDialog')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <WeeklyPlanFormDialog open onClose={vi.fn()} onSaved={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('WeeklyPlanFormDialog — dependent picker reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void divisionService
    void contactsService
  })

  it('clears the division and contact pickers when a different company is chosen', async () => {
    const user = userEvent.setup()
    await renderDialog()

    const companyInput = (await screen.findAllByPlaceholderText('Search company...'))[0]
    await user.type(companyInput, 'Cipla')
    const cipla = await screen.findByText('Cipla')
    fireEvent.click(cipla)

    // Company is now selected (shown as a filled value, not the search input).
    expect(await screen.findByText('Cipla')).toBeInTheDocument()

    const divisionInputs = screen.getAllByPlaceholderText('Search division...')
    expect(divisionInputs.length).toBeGreaterThan(0)

    await user.type(divisionInputs[0], 'Cardio')
    const cardio = await screen.findByText('Cardiology')
    fireEvent.click(cardio)
    expect(await screen.findByText('Cardiology')).toBeInTheDocument()

    // Re-picking the company (clear then re-select) must reset division/contact — division
    // picker goes back to disabled-until-reselected, not silently keeping the stale division.
    const companyValueChip = screen.getByText('Cipla')
    fireEvent.click(companyValueChip)

    const companyInputAgain = (await screen.findAllByPlaceholderText('Search company...'))[0]
    await user.type(companyInputAgain, 'Cipla')
    fireEvent.click(await screen.findByText('Cipla'))

    expect(screen.queryByText('Cardiology')).not.toBeInTheDocument()
  })

  it('never surfaces a supervisor field — approval is permission-gated, not supervisor-pinned', async () => {
    await renderDialog()
    await screen.findByText('New weekly plan')

    expect(screen.queryByText(/supervisor/i)).not.toBeInTheDocument()
  })
})
