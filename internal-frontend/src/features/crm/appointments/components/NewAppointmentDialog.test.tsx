import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { divisionService } from '@/features/crm/divisions/division.service'
import { contactsService } from '@/features/contacts/contacts.service'
import { crmService } from '@/features/crm/crm.service'

// Mocks the pickers' services so their queries resolve to empty lists
// instead of hitting the real API layer.
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    searchContacts: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/crm.service', () => ({
  crmService: { searchLeads: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })) },
}))
vi.mock('@/features/crm/appointments/hooks/useCreateAppointment', () => ({
  useCreateAppointment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDialog(prefill: { date: string; hour: number } | undefined, key?: string | number) {
  const NewAppointmentDialog = (await import('./NewAppointmentDialog')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NewAppointmentDialog key={key} open onClose={vi.fn()} onCreated={vi.fn()} prefill={prefill} />
    </QueryClientProvider>,
  )
}

describe('NewAppointmentDialog — prefill from the clicked calendar slot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the clicked slot\'s date and start hour, and derives the end time from the default 1hr duration', async () => {
    await renderDialog({ date: '2026-09-02', hour: 14 }, 'slot-1')

    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
    expect(await screen.findByText('Ends 15:00')).toBeInTheDocument()
  }, 15000)

  it('falls back to today\'s date, 10:00 start and a 1hr default duration when opened with no prefill (the header "New appointment" button)', async () => {
    await renderDialog(undefined, 'blank')

    expect(screen.getAllByText('10').length).toBeGreaterThan(0)
    expect(await screen.findByText('Ends 11:00')).toBeInTheDocument()
  })

  it('regression: remounting with a NEW key picks up a different prefill even when reopened after a previous session', async () => {
    const NewAppointmentDialog = (await import('./NewAppointmentDialog')).default
    const client = makeQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <NewAppointmentDialog key="session-1" open onClose={vi.fn()} onCreated={vi.fn()} prefill={{ date: '2026-09-02', hour: 14 }} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <NewAppointmentDialog key="session-2" open onClose={vi.fn()} onCreated={vi.fn()} prefill={{ date: '2026-09-02', hour: 14 }} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
    expect(await screen.findByText('Ends 15:00')).toBeInTheDocument()
  }, 20000)
})

describe('NewAppointmentDialog — City/State auto-derived from the selected company', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 2,
        items: [
          { id: 't-sunrise', code: 'clt-000001', name: 'Sunrise Pharma Ltd', address: { addressLine1: 'x', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }, businessLifetime: null, gst: null },
          { id: 't-nohq', code: 'clt-000002', name: 'No Address Pharma', address: null, businessLifetime: null, gst: null },
        ],
      },
    } as never)
  })

  it('shows "Select a company" placeholder for City/State before any company is picked', async () => {
    await renderDialog(undefined, 'city-state-empty')
    expect(await screen.findAllByPlaceholderText('Select a company')).toHaveLength(2)
  })

  it('fills City/State (read-only) from the selected company\'s address once picked', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'city-state-filled')

    await user.click(await screen.findByText('Select company...'))
    await user.click(await screen.findByRole('option', { name: 'Sunrise Pharma Ltd' }))

    expect(await screen.findByDisplayValue('Mumbai')).toBeDisabled()
    expect(screen.getByDisplayValue('Maharashtra')).toBeDisabled()
  })

  it('shows "—" for City/State when the selected company has no address on file', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'city-state-no-address')

    await user.click(await screen.findByText('Select company...'))
    await user.click(await screen.findByRole('option', { name: 'No Address Pharma' }))

    expect(await screen.findAllByPlaceholderText('—')).toHaveLength(2)
  })
})

describe('NewAppointmentDialog — Department/Designation auto-fill from the selected contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 't-sunrise', code: 'clt-000001', name: 'Sunrise Pharma Ltd', address: null, businessLifetime: null, gst: null }] },
    } as never)
    vi.mocked(divisionService.searchDivisions).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'div-1', name: 'Cardio', code: 'div-000001', therapy: [] }] },
    } as never)
    vi.mocked(contactsService.searchContacts).mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 2,
        items: [
          { id: 'c-with-dept', name: 'Dr. Mehta', department: 'marketing', designation: 'marketingmanager', type: 'customer', user: null, status: 'active' },
          { id: 'c-no-dept', name: 'No Dept Guy', type: 'customer', user: null, status: 'active' },
        ],
      },
    } as never)
  })

  async function pickCompanyAndDivision(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByText('Select company...'))
    await user.click(await screen.findByRole('option', { name: 'Sunrise Pharma Ltd' }))
    await user.click(await screen.findByText('Select division...'))
    await user.click(await screen.findByRole('option', { name: 'Cardio' }))
  }

  it('fills Department/Designation from the selected contact\'s own record', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'dept-autofill')
    await pickCompanyAndDivision(user)

    await user.click(await screen.findByText('Select contact...'))
    await user.click(await screen.findByRole('option', { name: 'Dr. Mehta' }))

    expect(await screen.findByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('Marketing Manager')).toBeInTheDocument()
  })

  it('leaves Department/Designation blank when the selected contact has neither', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'dept-autofill-empty')
    await pickCompanyAndDivision(user)

    await user.click(await screen.findByText('Select contact...'))
    await user.click(await screen.findByRole('option', { name: 'No Dept Guy' }))

    const departmentTrigger = (await screen.findByText('Department')).parentElement!.querySelector('[role="combobox"]')!
    expect(departmentTrigger.querySelector('[data-slot="select-value"]')).toBeEmptyDOMElement()
    const designationTrigger = screen.getByText('Designation').parentElement!.querySelector('[role="combobox"]')!
    expect(designationTrigger).toBeDisabled()
  })

  it('still allows overriding the auto-filled Department/Designation for this appointment', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'dept-autofill-override')
    await pickCompanyAndDivision(user)

    await user.click(await screen.findByText('Select contact...'))
    await user.click(await screen.findByRole('option', { name: 'Dr. Mehta' }))
    expect(await screen.findByText('Marketing')).toBeInTheDocument()

    await user.click(screen.getByText('Marketing'))
    await user.click(await screen.findByRole('option', { name: 'Purchase' }))

    await screen.findByText('Purchase')
    const designationTrigger = screen.getByText('Designation').parentElement!.querySelector('[role="combobox"]')!
    expect(designationTrigger.querySelector('[data-slot="select-value"]')).toBeEmptyDOMElement()
    expect(screen.queryByText('Marketing Manager')).not.toBeInTheDocument()
  })
})

describe('NewAppointmentDialog — linked lead first', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'tenant-1', name: 'Sunrise Pharma', address: { city: 'Mumbai', state: 'Maharashtra' } }] },
    } as never)
    vi.mocked(divisionService.searchDivisions).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'division-1', name: 'Cardio' }] },
    } as never)
    vi.mocked(contactsService.searchContacts).mockResolvedValue({
      success: true, message: '', data: { count: 2, items: [
        { id: 'contact-1', name: 'Dr. Mehta', department: 'marketing', designation: 'marketingmanager' },
        { id: 'contact-2', name: 'Other Cardio Contact' },
      ] },
    } as never)
    vi.mocked(crmService.searchLeads).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{
        id: 'lead-1', title: 'Cardio project', code: 'ld-000001', status: 'new',
        tenant: { _id: 'tenant-1', name: 'Sunrise Pharma', code: 'clt-1' },
        division: { _id: 'division-1', name: 'Cardio', code: 'div-1', therapy: [] },
        contactPerson: { _id: 'contact-1', division: 'division-1', tenant: 'tenant-1', name: 'Dr. Mehta', department: 'marketing', designation: 'marketingmanager', type: 'customer', status: 'active' },
      }] },
    } as never)
  })

  it('puts the linked lead before account and fills company, division, contact, department, and designation', async () => {
    const user = userEvent.setup()
    await renderDialog(undefined, 'lead-first')
    await user.click(screen.getByRole('button', { name: 'Follow-up' }))
    const leadLabel = screen.getByText(/Linked lead/)
    const companyLabel = screen.getByText('Company *')
    expect(leadLabel.compareDocumentPosition(companyLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.type(screen.getByPlaceholderText('Search lead by title...'), 'Cardio')
    await user.click(await screen.findByRole('button', { name: /Cardio project/ }))
    expect(await screen.findByText('Sunrise Pharma')).toBeInTheDocument()
    expect(screen.getByText('Cardio')).toBeInTheDocument()
    expect(screen.getByText('Dr. Mehta')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('Marketing Manager')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mumbai')).toBeDisabled()
    expect(vi.mocked(contactsService.searchContacts)).toHaveBeenCalledWith(expect.objectContaining({ division: 'division-1', status: 'active' }))
    await user.click(screen.getByRole('button', { name: 'Clear linked lead' }))
    await user.type(screen.getByPlaceholderText('Search lead by title...'), 'Cardio')
    expect(await screen.findByRole('button', { name: /Cardio project/ })).toBeInTheDocument()
    expect(vi.mocked(crmService.searchLeads)).toHaveBeenCalledWith(expect.objectContaining({ division: 'division-1', limit: '10' }))
  })
})
