import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/components/ui/sonner'
import type { SessionResponse } from '@/types/accessManagement.types'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/hooks/useSession')

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    createDoctor: vi.fn(async () => ({ success: true, message: '', data: {} })),
    updateDoctor: vi.fn(async () => ({ success: true, message: '', data: {} })),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-cipla', name: 'Cipla', code: 'cipla' }], count: 1 } })),
  },
}))

function sessionFixture(tenantType: 'platform' | 'customer'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'r-1', code: 'admin', name: 'Admin' },
    roleType: { id: 'rt-1', code: 'admin', name: 'admin' },
    tenant: { id: 't-1', code: 'qms', name: 'QMS', type: tenantType },
    permissions: ['doctor:manage'],
  } as unknown as SessionResponse
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp',
    mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra',
    pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '', tenant: 't-1',
    ...overrides,
  } as DoctorEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// EditDoctorModal's labels aren't associated via htmlFor — locate the input
// by its label text's sibling instead of getByLabelText.
function inputForLabel(labelText: RegExp): HTMLInputElement {
  const label = screen.getByText(labelText)
  const input = label.parentElement?.querySelector('input')
  if (!input) throw new Error(`no input found next to label matching ${labelText}`)
  return input
}

async function mockSession(tenantType: 'platform' | 'customer') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({ session: sessionFixture(tenantType) } as unknown as ReturnType<typeof useSession>)
}

async function renderModal(doctor: DoctorEntity | null, onClose = vi.fn()) {
  const EditDoctorModal = (await import('./EditDoctorModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditDoctorModal open doctor={doctor} onClose={onClose} />
    </QueryClientProvider>,
  )
}

async function renderModalWithCaller(opts: {
  onClose?: () => void
  onCreated?: (doctor: DoctorEntity) => void
  forcedTenant?: { id: string; label: string }
}) {
  const EditDoctorModal = (await import('./EditDoctorModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditDoctorModal
        open
        doctor={null}
        onClose={opts.onClose ?? vi.fn()}
        onCreated={opts.onCreated}
        forcedTenant={opts.forcedTenant}
      />
    </QueryClientProvider>,
  )
}

describe('EditDoctorModal — tenant field', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the Company field for a platform caller creating a new doctor, and blocks submit until one is picked', async () => {
    await mockSession('platform')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    expect(await screen.findByText(/company \*/i)).toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Company is required'))
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('submits the picked tenant id for a platform caller', async () => {
    await mockSession('platform')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBe('t-cipla')
  })

  it('hides the Company field for a customer-tenant caller and omits tenant from the payload', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    expect(screen.queryByText(/company \*/i)).not.toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBeUndefined()
  })

  it('never shows the Company field in edit mode, even for a platform caller', async () => {
    await mockSession('platform')
    await renderModal(doctorFixture())

    expect(screen.queryByText(/company \*/i)).not.toBeInTheDocument()
  })
})

describe('EditDoctorModal — forcedTenant + onCreated (inline-from-camp-form callers)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders forcedTenant as locked read-only text, never an editable picker, even for a platform caller', async () => {
    await mockSession('platform')
    await renderModalWithCaller({ forcedTenant: { id: 't-forced', label: 'Forced Co (forced)' } })

    expect(screen.getByText(/forced co \(forced\)/i)).toBeInTheDocument()
    expect(screen.getByText(/locked to the camp being booked/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search company by name/i)).not.toBeInTheDocument()
    // The picker's own "Company *" label (required-picker case) is absent too.
    expect(screen.queryByText(/^Company \*/i)).not.toBeInTheDocument()
  })

  it('submits forcedTenant.id regardless of session type, ignoring any picker state', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModalWithCaller({ forcedTenant: { id: 't-forced', label: 'Forced Co (forced)' } })

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    expect(vi.mocked(doctorsService.createDoctor).mock.calls[0][0].tenant).toBe('t-forced')
  })

  it('fires onCreated with the created doctor only on a genuine create success', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const created = doctorFixture({ id: 'doc-new', name: 'Dr. New' })
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({ success: true, message: '', data: created })

    const onCreated = vi.fn()
    const user = userEvent.setup()
    await renderModalWithCaller({ onCreated, forcedTenant: { id: 't-forced', label: 'Forced Co' } })

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('never fires onCreated on Cancel/dismiss', async () => {
    await mockSession('customer')
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModalWithCaller({ onCreated, onClose, forcedTenant: { id: 't-forced', label: 'Forced Co' } })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('never fires onCreated on an edit/update, even when the prop is supplied', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.updateDoctor).mockResolvedValue({ success: true, message: '', data: doctorFixture() })

    const onCreated = vi.fn()
    const EditDoctorModal = (await import('./EditDoctorModal')).default
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EditDoctorModal open doctor={doctorFixture()} onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(doctorsService.updateDoctor).toHaveBeenCalledTimes(1))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
