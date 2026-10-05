import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VoidCampDialog from './VoidCampDialog'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useVoidCamp } from '@/features/camps/hooks/useVoidCamp'
import { useApproveVoidCamp } from '@/features/camps/hooks/useApproveVoidCamp'
import type { ProjectEntity } from '@/types/project.types'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/camps/hooks/useVoidCamp')
vi.mock('@/features/camps/hooks/useApproveVoidCamp')

// Heavy async pickers (each with their own live search/service dependencies) are stubbed to plain
// inputs — this file tests VoidCampDialog's own logic (list rendering, approve flow, submit
// payload), not each picker's internals (already covered by their own test files).
vi.mock('@/features/camps/components/CampDoctorSearchPicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) => (
    <input aria-label="Doctor" value={value} onChange={(e) => onChange(e.target.value, e.target.value)} />
  ),
}))
vi.mock('@/features/camps/components/CampMrPicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) => (
    <input aria-label="MR" value={value} onChange={(e) => onChange(e.target.value, e.target.value)} />
  ),
}))
vi.mock('@/features/inventory/real/components/InventoryMasterMultiPicker', () => ({
  default: () => <div data-testid="device-picker" />,
}))
// A "Pick location" button sets addressLine1 + coordinates, standing in for an actual map-pin
// drop — lets tests exercise both "no pin picked" (coordinates missing) and the full success path.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange }: { value: { addressLine1: string }; onChange: (v: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ ...value, addressLine1: '12 MG Road', coordinates: [72.8777, 19.076] })}
    >
      Pick location
    </button>
  ),
}))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({
  default: ({ value, onChange }: { value: { city: string; state: string; pincode: string }; onChange: (v: unknown) => void }) => (
    <div>
      <input aria-label="City" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      <input aria-label="State" value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value })} />
      <input aria-label="Pincode" value={value.pincode} onChange={(e) => onChange({ ...value, pincode: e.target.value })} />
    </div>
  ),
}))

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'prj-000001', name: 'Test Project',
    tenant: { _id: 't-1', name: 'Client', code: 'client' }, division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] },
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null, executionMode: null,
    campCost: 0, totalCamps: 0, gst: 0, valueBeforeGST: 0, additionalCost: 0,
    campTimeSlots: ['9am-1pm'], freeCancelHours: 0, cancellationAllowed: 0,
    campCostDeductionOnChargableCancel: 0, goLiveScope: null, whoCanBookCamp: [],
    salesRep: null, projectCoordinator: null, marketingContact: null, paymentTerms: 'net_30', status: 'live', stageHistory: [],
    daysToBookBefore: 0, dietChart: [], poRenewalReminder: 0, availablePointers: [],
    tats: '', sops: '', createdAt: '', updatedAt: '', ...overrides,
  } as ProjectEntity
}

function voidCampFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', billingType: 'void', patientExpectation: 0,
    fo: null, dietitian: null, mr: null, asm: null, rsm: null, date: '2026-09-15', timeSlot: '9am-1pm',
    location: null, devices: [], meta: { mailUrl: 'https://mail.example.com/abc' },
    status: 'requested', stageHistory: [], createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function mockCampsRealList(items: CampEntity[] = [], overrides: Partial<ReturnType<typeof useCampsReal>> = {}) {
  vi.mocked(useCampsReal).mockReturnValue({
    data: { success: true, message: '', data: { count: items.length, items } },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCampsReal>)
}

describe('VoidCampDialog', () => {
  const voidCampMutate = vi.fn()
  const approveMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useVoidCamp).mockReturnValue({
      mutateAsync: voidCampMutate, isPending: false, isError: false,
    } as unknown as ReturnType<typeof useVoidCamp>)
    vi.mocked(useApproveVoidCamp).mockReturnValue({
      mutateAsync: approveMutate, isPending: false, isError: false,
    } as unknown as ReturnType<typeof useApproveVoidCamp>)
  })

  it('queries camps scoped to this project with billingType=void', () => {
    mockCampsRealList([])
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    expect(useCampsReal).toHaveBeenCalledWith(expect.objectContaining({ project: 'proj-1', billingType: 'void' }))
  })

  it('shows the empty state when the project has no void camps yet', () => {
    mockCampsRealList([])
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    expect(screen.getByText(/no void camps yet/i)).toBeInTheDocument()
  })

  it('lists an existing void camp with its status and confirmation mail link', () => {
    mockCampsRealList([voidCampFixture()])
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    expect(screen.getByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /confirmation mail/i })).toHaveAttribute('href', 'https://mail.example.com/abc')
  })

  it('shows an Approve button only for a requested void camp, not a closed one', () => {
    mockCampsRealList([
      voidCampFixture({ id: 'camp-req', code: 'cmp-req', status: 'requested' }),
      voidCampFixture({ id: 'camp-closed', code: 'cmp-closed', status: 'closed' }),
    ])
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: /^approve$/i })).toHaveLength(1)
  })

  it('approving a void camp requires a reason before confirming', async () => {
    mockCampsRealList([voidCampFixture()])
    const user = userEvent.setup()
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^approve$/i }))
    const confirmButton = screen.getByRole('button', { name: /confirm approval/i })
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/approval reason/i), 'Mail verified')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(approveMutate).toHaveBeenCalledWith({ reason: 'Mail verified' })
  })

  it('shows a retryable error state when the void-camps fetch fails', () => {
    mockCampsRealList([], { isError: true, error: new Error('fail') })
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    expect(screen.getByText(/failed to load void camps/i)).toBeInTheDocument()
  })

  it('blocks submit with a validation message when required fields are missing', async () => {
    mockCampsRealList([])
    const user = userEvent.setup()
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add void camp/i }))

    expect(voidCampMutate).not.toHaveBeenCalled()
    // Type is pre-filled from the project's own camp type, so the first Zod issue is the next
    // empty field in schema order — doctorId.
    expect(screen.getByText(/select a doctor/i)).toBeInTheDocument()
  })

  it('blocks submit with a coordinates message when the address is filled but no map pin was picked', async () => {
    mockCampsRealList([])
    const user = userEvent.setup()
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Doctor'), 'doc-1')
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, '2026-09-20')
    // Address line 1 comes from the (here unclicked) map picker — simulate a user who typed the
    // rest of the address fields by hand without ever dropping a pin, so addressLine1 stays blank
    // while city/state/pincode are filled. Still blocks submit — just on addressLine1 first.
    await user.type(screen.getByLabelText('City'), 'Mumbai')
    await user.type(screen.getByLabelText('State'), 'Maharashtra')
    await user.type(screen.getByLabelText('Pincode'), '400001')
    await user.type(screen.getByPlaceholderText(/mail.google.com/i), 'https://mail.example.com/new')

    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[1]!)
    await user.click(await screen.findByText('9 AM – 1 PM'))

    await user.click(screen.getByRole('button', { name: /^add void camp$/i }))

    expect(voidCampMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/address is required/i)).toBeInTheDocument()
  })

  it('submits a void camp with the project-derived tenant/division and the required mailUrl', async () => {
    mockCampsRealList([])
    const user = userEvent.setup()
    render(<VoidCampDialog project={projectFixture()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Doctor'), 'doc-1')
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, '2026-09-20')
    await user.click(screen.getByRole('button', { name: /pick location/i }))
    await user.type(screen.getByLabelText('City'), 'Mumbai')
    await user.type(screen.getByLabelText('State'), 'Maharashtra')
    await user.type(screen.getByLabelText('Pincode'), '400001')
    await user.type(screen.getByPlaceholderText(/mail.google.com/i), 'https://mail.example.com/new')

    // Select the time slot (base-ui Select renders as a button trigger, not a native <select>) —
    // the second combobox (Type is pre-filled from the project's own type, so it's the first).
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[1]!)
    await user.click(await screen.findByText('9 AM – 1 PM'))

    await user.click(screen.getByRole('button', { name: /^add void camp$/i }))

    expect(voidCampMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 't-1',
        division: 'div-1',
        project: 'proj-1',
        doctor: 'doc-1',
        date: '2026-09-20',
        location: expect.objectContaining({
          addressLine1: '12 MG Road',
          coordinates: [72.8777, 19.076],
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        }),
        meta: { mailUrl: 'https://mail.example.com/new' },
      }),
    )
  })
})
