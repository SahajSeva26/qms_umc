import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// LocationPicker needs real Google Maps credentials, unavailable in tests —
// mock it to a button using the same onChange(LocationValue) contract a real pin-drop would use.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({ ...(value as object ?? {}), coordinates: [73.8567, 18.5204] })}
      >
        Set test coordinates
      </button>
      {/* Simulates the real widget's "pin moved, reverse-geocode still resolving" window. */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } })),
    createTenant: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-tenant-id' } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDialog() {
  const CreateTenantDialog = (await import('./CreateTenantDialog')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <CreateTenantDialog />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillStep0AndAdvance(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
  await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
  await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
  const option = await screen.findByText(/sales rep one/i)
  await user.click(option)
  await user.click(screen.getByRole('button', { name: /^next$/i }))
}

describe('CreateTenantDialog — address', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates a company with NO address at all — address is optional end-to-end', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')

    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createTenant).mock.calls[0][0]
    expect(payload.address).toBeUndefined()
  })

  it('creates a company WITH an address when the user fills one in', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
    await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
    await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
    await user.click(await screen.findByText(/sales rep one/i))

    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '411001')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))

    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')

    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createTenant).mock.calls[0][0]
    expect(payload.address).toEqual(expect.objectContaining({
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    }))
  })

  it('advancing to step 2 does not require an address to be filled in', async () => {
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    // Reaching step 2's owner fields proves the address-less advance succeeded.
    expect(await screen.findByLabelText(/first name \*/i)).toBeInTheDocument()
  })

  it('a PARTIAL address (only City typed) blocks advancing to step 2, with the error visible on step 0 — not a silently stuck submit on step 2', async () => {
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
    await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
    await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
    await user.click(await screen.findByText(/sales rep one/i))

    // Only City typed — LocationAddressFields still turns this into a
    // non-null, individually-invalid LocationValue object.
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Must stay on step 0 — the owner-account fields (step 2) must never appear.
    expect(screen.queryByLabelText(/first name \*/i)).not.toBeInTheDocument()
    // City was filled; addressLine1/state/pincode weren't — each renders as
    // its own line via FieldErrorText, so assert each expected message
    // individually rather than one ambiguous OR-regex across all four.
    expect(await screen.findByText('Address is required.')).toBeInTheDocument()
    expect(screen.getByText('State is required.')).toBeInTheDocument()
    expect(screen.getByText('Pincode is required.')).toBeInTheDocument()
    expect(screen.queryByText('City is required.')).not.toBeInTheDocument()
  })

  async function fillStep0WithAddressAndAdvance(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
    await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
    await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
    await user.click(await screen.findByText(/sales rep one/i))
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '411001')
  }

  it('disables Create company (relabeled "Resolving location…") while the picked pin is still resolving, so createTenant is never called', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0WithAddressAndAdvance(user)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')

    const submitButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(submitButton).toBeDisabled()
    await user.click(submitButton)
    expect(accessManagementService.createTenant).not.toHaveBeenCalled()
  })

  it('allows Create company once resolution returns to idle after a loading state', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0WithAddressAndAdvance(user)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
  })
})
