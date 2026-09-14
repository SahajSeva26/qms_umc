import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tenant } from '@/types/accessManagement.types'

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
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    updateTenant: vi.fn(async () => ({ success: true, message: '', data: {} })),
  },
}))

function tenantFixture(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't-1', code: 'acme', name: 'Acme Pharma', address: null,
    businessLifetime: null, gst: null,
    status: 'active', type: 'customer', salesPerson: null,
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderModal(tenant: Tenant, overrides: { canManageTenant?: boolean; canManageSystem?: boolean } = {}) {
  const EditTenantModal = (await import('./EditTenantModal')).default
  const onClose = vi.fn()
  const utils = render(
    <QueryClientProvider client={makeQueryClient()}>
      <EditTenantModal
        tenant={tenant}
        canManageTenant={overrides.canManageTenant ?? true}
        canManageSystem={overrides.canManageSystem ?? true}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { ...utils, onClose }
}

describe('EditTenantModal — address', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a legacy tenant with address: null renders with the address fields empty, not crashing', async () => {
    await renderModal(tenantFixture({ address: null }))
    expect(screen.getByLabelText(/^address line 1$/i)).toHaveValue('')
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('')
  })

  it('an existing address pre-fills the address fields', async () => {
    await renderModal(tenantFixture({
      address: {
        addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
        pincode: '411001', coordinates: [73.8567, 18.5204],
      },
    }))
    expect(screen.getByLabelText(/^address line 1$/i)).toHaveValue('221 Baker Street')
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Pune')
  })

  it('saving WITHOUT touching the address omits it from the payload entirely — never resends a stale snapshot', async () => {
    // Address is replace-wholesale server-side (no partial merge), so an
    // unsent key is the only way to leave it untouched.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({
      address: {
        addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
        pincode: '411001', coordinates: [73.8567, 18.5204],
      },
    }))

    await user.type(screen.getByLabelText(/^name$/i), ' Updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.address).toBeUndefined()
  })

  it('editing a NON-address field and re-typing the SAME address value still sends address (RHF dirty tracking, not a value-equality check)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    const existingAddress: NonNullable<Tenant['address']> = {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    }
    await renderModal(tenantFixture({ address: existingAddress }))

    await user.type(screen.getByLabelText(/^address line 2 \(optional\)$/i), 'x')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.address).toBeDefined()
  })

  it('a legacy tenant (address: null) can be saved without ever setting an address — omitted (undefined), not sent as null', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({ address: null }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.address).toBeUndefined()
  })

  it('editing the address updates the payload', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({ address: null }))

    await user.type(screen.getByLabelText(/^address line 1$/i), '1 New Road')
    await user.type(screen.getByLabelText(/^city$/i), 'Mumbai')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '400001')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.address).toEqual(expect.objectContaining({ city: 'Mumbai', coordinates: [73.8567, 18.5204] }))
  })

  it('disables Save (relabeled "Resolving location…") while the picked pin is still resolving, so updateTenant is never called', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({
      address: {
        addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
        pincode: '411001', coordinates: [73.8567, 18.5204],
      },
    }))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const saveButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(saveButton).toBeDisabled()
    await user.click(saveButton)
    expect(accessManagementService.updateTenant).not.toHaveBeenCalled()
  })

  it('allows Save once resolution returns to idle after a loading state', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({
      address: {
        addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
        pincode: '411001', coordinates: [73.8567, 18.5204],
      },
    }))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
  })
})

describe('EditTenantModal — gst / businessLifetime concurrency', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('saving with only an unrelated field touched omits gst and businessLifetime entirely — never resends a stale snapshot', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({ gst: '27AAPFU0939F1ZV', businessLifetime: 5 }))

    await user.type(screen.getByLabelText(/^name$/i), ' Updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.gst).toBeUndefined()
    expect(payload.businessLifetime).toBeUndefined()
    expect(payload).not.toHaveProperty('gst')
    expect(payload).not.toHaveProperty('businessLifetime')
  })

  it('editing gst or businessLifetime directly includes that field in the payload', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({ gst: '27AAPFU0939F1ZV', businessLifetime: 5 }))

    await user.clear(screen.getByLabelText(/^gst number$/i))
    await user.type(screen.getByLabelText(/^gst number$/i), '29AABCU9603R1ZM')
    await user.clear(screen.getByLabelText(/business lifetime/i))
    await user.type(screen.getByLabelText(/business lifetime/i), '8')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(accessManagementService.updateTenant).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(accessManagementService.updateTenant).mock.calls[0]
    expect(payload.gst).toBe('29AABCU9603R1ZM')
    expect(payload.businessLifetime).toBe(8)
  })

  it('blanking an already-set gst or businessLifetime warns instead of silently reverting on save', async () => {
    const user = userEvent.setup()
    await renderModal(tenantFixture({ gst: '27AAPFU0939F1ZV', businessLifetime: 5 }))

    expect(screen.queryByText(/can't be cleared once set/i)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^gst number$/i))
    expect(await screen.findAllByText(/can't be cleared once set/i)).toHaveLength(1)

    await user.clear(screen.getByLabelText(/business lifetime/i))
    expect(await screen.findAllByText(/can't be cleared once set/i)).toHaveLength(2)
  })

  it('blanking an already-set gst blocks Save entirely — no silent no-op that looks like success', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup()
    await renderModal(tenantFixture({ gst: '27AAPFU0939F1ZV' }))

    await user.clear(screen.getByLabelText(/^gst number$/i))
    await screen.findByText(/can't be cleared once set/i)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    await user.click(saveButton)
    expect(accessManagementService.updateTenant).not.toHaveBeenCalled()
  })

  it('a tenant with no gst/businessLifetime set shows no warning when those (already-empty) fields are left alone', async () => {
    await renderModal(tenantFixture({ gst: null, businessLifetime: null }))
    expect(screen.queryByText(/can't be cleared once set/i)).not.toBeInTheDocument()
  })
})
