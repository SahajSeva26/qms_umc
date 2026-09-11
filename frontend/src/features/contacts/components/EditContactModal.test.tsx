import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactEntity } from '@/types/contact.types'

vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    updateContact: vi.fn(async () => ({ success: true, message: '', data: { id: 'contact-1' } })),
  },
}))

// usePermission -> useSession fetches GET /auth/me unconditionally; a
// customer-tenant session keeps needsTenantPicker/needsDivision both false
// in edit mode, matching this modal's edit-only test scope. Overridden to a
// platform-tenant session in the create-mode describe block below, which
// needs both pickers to reach the tenant-change reset path.
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getMe: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
        role: { id: 'r-1', code: 'admin', name: 'Admin' },
        roleType: { id: 'rt-1', code: 'admin', name: 'admin' },
        tenant: { id: 't-1', code: 'acme', name: 'Acme', type: 'customer' },
        permissions: ['contact:manage'],
      },
    })),
    searchTenants: vi.fn(async () => ({
      success: true, message: '',
      data: { items: [{ id: 'tenant-a', name: 'Tenant A', type: 'customer' }, { id: 'tenant-b', name: 'Tenant B', type: 'customer' }], count: 2 },
    })),
  },
}))

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({
      success: true, message: '',
      data: { items: [{ id: 'div-x', name: 'Division X' }], count: 1 },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function contactFixture(overrides: Partial<ContactEntity> = {}): ContactEntity {
  return {
    id: 'contact-1',
    tenant: 't-1',
    division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] } as unknown as ContactEntity['division'],
    name: 'STALE-NAME',
    designation: 'Marketing Manager',
    email: 'stale@example.com',
    phone: '9876543210',
    location: 'Pune',
    type: 'customer',
    user: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ContactEntity
}

async function renderModal(contact: ContactEntity, onClose = vi.fn()) {
  const EditContactModal = (await import('./EditContactModal')).default
  const queryClient = makeQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <EditContactModal open contact={contact} onClose={onClose} />
    </QueryClientProvider>,
  )
  await screen.findByText(/edit contact/i)
}

describe('EditContactModal — partial update payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saving without touching any field omits name/location/designation — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { contactsService } = await import('@/features/contacts/contacts.service')
    const user = userEvent.setup()
    await renderModal(contactFixture())

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(contactsService.updateContact).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('location')
    expect(payload).not.toHaveProperty('designation')
  })

  it('editing name directly includes only name in the payload', async () => {
    const { contactsService } = await import('@/features/contacts/contacts.service')
    const user = userEvent.setup()
    await renderModal(contactFixture({ name: 'OLD-NAME' }))

    const nameInput = screen.getByDisplayValue('OLD-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'NEW-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(contactsService.updateContact).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('NEW-NAME')
    expect(payload).not.toHaveProperty('location')
  })

  // location has no guard at all in the payload builder (plain `|| undefined`
  // only folds emptiness) — an untouched, populated value would previously
  // always be resent. Proves the gate now covers it.
  it('editing location directly includes only location, leaving the untouched name out', async () => {
    const { contactsService } = await import('@/features/contacts/contacts.service')
    const user = userEvent.setup()
    await renderModal(contactFixture({ name: 'STALE-NAME', location: 'OLD-LOCATION' }))

    const locationInput = screen.getByDisplayValue('OLD-LOCATION')
    await user.clear(locationInput)
    await user.type(locationInput, 'NEW-LOCATION')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(contactsService.updateContact).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.location).toBe('NEW-LOCATION')
    expect(payload).not.toHaveProperty('name')
  })

  // Dirty-gating must compare the FINAL value to the original snapshot, not
  // "was the field ever touched" — editing then reverting is a no-op.
  it('editing a field then reverting it to its exact original value omits it from the payload', async () => {
    const { contactsService } = await import('@/features/contacts/contacts.service')
    const user = userEvent.setup()
    await renderModal(contactFixture({ name: 'ORIGINAL-NAME', location: 'STALE-LOCATION' }))

    const nameInput = screen.getByDisplayValue('ORIGINAL-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'TEMP-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'ORIGINAL-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(contactsService.updateContact).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('location')
  })

  // '' must still be sent (not omitted) when it's a genuine change from a
  // non-empty original — proves the revert-to-original fix didn't fold a
  // deliberate clear into "unchanged" via an empty-string falsy check.
  it('explicitly clearing designation from a non-empty original still sends designation: "" ', async () => {
    const { contactsService } = await import('@/features/contacts/contacts.service')
    const user = userEvent.setup()
    await renderModal(contactFixture({ designation: 'Marketing Manager' }))

    await user.click(screen.getByText('Marketing Manager'))
    await user.click(await screen.findByRole('option', { name: '—' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(contactsService.updateContact).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).toHaveProperty('designation', '')
  })
})

describe('EditContactModal — create mode, platform session (tenant + division pickers both shown)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.getMe).mockResolvedValue({
      success: true, message: '',
      data: {
        user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
        role: { id: 'r-1', code: 'admin', name: 'Admin' },
        roleType: { id: 'rt-1', code: 'admin', name: 'admin' },
        tenant: { id: 'platform-1', code: 'platform', name: 'Platform', type: 'platform' },
        permissions: ['contact:manage'],
      },
    } as never)
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '',
      data: { items: [{ id: 'tenant-a', name: 'Tenant A', type: 'customer' }, { id: 'tenant-b', name: 'Tenant B', type: 'customer' }], count: 2 },
    } as never)
  })

  async function renderCreateModal() {
    const EditContactModal = (await import('./EditContactModal')).default
    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <EditContactModal open contact={null} onClose={vi.fn()} />
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: /add contact/i })
  }

  it('picking a division, then changing the company, resets the division — a stale pick from the old company is never submitted', async () => {
    const user = userEvent.setup()
    await renderCreateModal()

    await screen.findByText('Select company')
    const companyCombobox = () => screen.getByText('Company').parentElement!.querySelector('[role="combobox"]') as HTMLElement
    const divisionCombobox = () => screen.getByText('Division').parentElement!.querySelector('[role="combobox"]') as HTMLElement

    await user.click(companyCombobox())
    await user.click(await screen.findByText('Tenant A'))

    await user.click(divisionCombobox())
    await user.click(await screen.findByText('Division X'))
    expect(screen.getByText('Division X')).toBeInTheDocument()

    await user.click(companyCombobox())
    await user.click(await screen.findByText('Tenant B'))

    expect(screen.queryByText('Division X')).not.toBeInTheDocument()
    expect(screen.getByText(/select division/i)).toBeInTheDocument()
  })
})
