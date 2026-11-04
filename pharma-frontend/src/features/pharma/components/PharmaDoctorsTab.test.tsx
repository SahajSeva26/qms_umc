import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaDoctorsTab from './PharmaDoctorsTab'
import { useSession } from '@/hooks/useSession'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/hooks/useSession')

const { searchDoctors } = vi.hoisted(() => ({
  searchDoctors: vi.fn(async (): Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }> =>
    ({ success: true, message: '', data: { items: [], count: 0 } })),
}))

vi.mock('@/features/pharma/doctors.service', () => ({
  doctorsService: { searchDoctors },
}))

vi.mock('@/features/pharma/components/EditDoctorModal', () => ({
  default: () => null,
}))

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'SUN-CP-2418', name: 'Dr Ramesh Sharma', specialization: 'cardiologist',
    mobile: '+919820011111', email: 'r.sharma@hotmail.com',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'MH', pincode: '400053', coordinates: [72.8, 19.0] },
    createdAt: '', updatedAt: '',
    stats: { camps: 2, patients: 0, patientsCompleted: 0 },
    ...overrides,
  } as DoctorEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockSession(permissions: string[]) {
  vi.mocked(useSession).mockReturnValue({
    session: { user: { id: 'u-1' }, role: { id: 'role-1', code: 'pharma-mr', division: 'div-1' }, roleType: { code: 'pharma-mr' }, tenant: { id: 't-1', name: 'Tenant' }, permissions },
    permissions,
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => permissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
}

function renderTab() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaDoctorsTab />
    </QueryClientProvider>,
  )
}

describe('PharmaDoctorsTab — pharma-frontend parity with internal-frontend (lean MR-only port)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides "Add new doctor" with neither doctor:create nor doctor:manage', () => {
    mockSession([])
    renderTab()

    expect(screen.queryByRole('button', { name: /add new doctor/i })).not.toBeInTheDocument()
  })

  it('shows "Add new doctor" for a session holding only doctor:create — the configured default for pharma-mr role types', () => {
    mockSession(['doctor:create'])
    renderTab()

    expect(screen.getByRole('button', { name: /add new doctor/i })).toBeInTheDocument()
  })

  it('shows "Add new doctor" with doctor:manage too', () => {
    mockSession(['doctor:manage'])
    renderTab()

    expect(screen.getByRole('button', { name: /add new doctor/i })).toBeInTheDocument()
  })

  it('renders a table with this lean port\'s column set (no Rx total — dropped, not backed by any entity)', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Clinic address' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Camps' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Rx total' })).not.toBeInTheDocument()
  })

  it('requests report=true so the real per-doctor camps count is available, not a fake 0', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ report: 'true' }))
    expect(screen.getByText('2 camps')).toBeInTheDocument()
  })

  it('scopes the search to the session\'s own division', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession(['doctor:manage'])
    renderTab()

    await vi.waitFor(() => expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ division: 'div-1' })))
  })

  it('renders the full clinic address line when location is present', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    expect(await screen.findByText('1 MG Road, Mumbai, MH, 400053')).toBeInTheDocument()
  })

  it('shows "—" when location is entirely absent', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture({ location: null })], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('derives initials by dropping the first name-part (e.g. "Dr"), matching the prototype exactly', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture({ name: 'Dr Ramesh Sharma' })], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    expect(await screen.findByText('RS')).toBeInTheDocument()
  })

  it('"Modify" is hidden without doctor:create or doctor:manage', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession([])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.queryByRole('button', { name: /modify/i })).not.toBeInTheDocument()
  })

  it('"Modify" is shown for doctor:create alone — the permission a real MR holds today — so it lights up the moment backend allows the edit, no frontend change needed', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:create'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument()
  })

  it('shows a doctor-list-shaped skeleton (not plain loading text) before the first response resolves', async () => {
    searchDoctors.mockReturnValue(new Promise(() => {}))
    mockSession(['doctor:manage'])
    renderTab()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading doctors/i)).not.toBeInTheDocument()
  })

  it('a page change keeps the existing rows on screen (dimmed) instead of blanking the table and replaying the full skeleton', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => doctorFixture({ id: `doc-${i}`, name: `Dr Page One ${i}` }))
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: page1, count: 12 } })
    mockSession(['doctor:manage'])
    renderTab()
    await screen.findByText('Page 1 of 2')

    let resolvePage2!: (v: Awaited<ReturnType<typeof searchDoctors>>) => void
    searchDoctors.mockReturnValue(new Promise((resolve) => { resolvePage2 = resolve }))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Page 1's row is still in the DOM mid-refetch — not replaced by the full skeleton.
    expect(screen.getByText('Dr Page One 0')).toBeInTheDocument()
    // Pagination is disabled while the refetch is in flight, to prevent a double page-jump.
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()

    resolvePage2({ success: true, message: '', data: { items: [doctorFixture({ id: 'doc-11', name: 'Dr Page Two' })], count: 12 } })
    await screen.findByText('Dr Page Two')
  })

  it('shows the error state with Retry on failure', async () => {
    searchDoctors.mockRejectedValueOnce(new Error('network error'))
    mockSession(['doctor:manage'])
    renderTab()

    expect(await screen.findByText(/failed to load doctors/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows the empty state when the division has no doctors', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession(['doctor:manage'])
    renderTab()

    expect(await screen.findByText(/no doctors found in your division/i)).toBeInTheDocument()
  })

  it('shows a "couldn\'t resolve your division" message when the session has none', () => {
    vi.mocked(useSession).mockReturnValue({
      session: { user: { id: 'u-1' }, role: { id: 'role-1', code: 'pharma-mr', division: null }, roleType: { code: 'pharma-mr' }, tenant: { id: 't-1', name: 'Tenant' }, permissions: [] },
      permissions: [],
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
    } as unknown as ReturnType<typeof useSession>)
    renderTab()

    expect(screen.getByText(/couldn't resolve your division/i)).toBeInTheDocument()
    expect(searchDoctors).not.toHaveBeenCalled()
  })

  // These two re-import the real module tree without the top-level EditDoctorModal mock (see
  // vi.resetModules below), so the real lazy() boundary and its "Opening editor…" shell actually
  // run — proving the P2 follow-up: a dialog-shell fallback for this large (Maps-SDK) chunk, and
  // hover/focus prefetch that warms it before the click lands.
  it('shows an "Opening editor…" dialog shell while the (large) EditDoctorModal chunk is still loading, not a blank pane', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])

    vi.doMock('@/features/pharma/components/EditDoctorModal', () => new Promise(() => {}))
    vi.resetModules()
    const PharmaDoctorsTab = (await import('./PharmaDoctorsTab')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <PharmaDoctorsTab />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /add new doctor/i }))

    expect(await screen.findByText(/opening editor/i)).toBeInTheDocument()
  })

  it('pre-warms the EditDoctorModal chunk on hover of "Add new doctor", before the click lands', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])

    const loadEditDoctorModal = vi.fn(() => new Promise(() => {}))
    vi.doMock('@/features/pharma/components/EditDoctorModal', loadEditDoctorModal)
    vi.resetModules()
    const PharmaDoctorsTab = (await import('./PharmaDoctorsTab')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <PharmaDoctorsTab />
      </QueryClientProvider>,
    )
    await screen.findByText('Dr Ramesh Sharma')

    expect(loadEditDoctorModal).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.hover(screen.getByRole('button', { name: /add new doctor/i }))
    expect(loadEditDoctorModal).toHaveBeenCalledTimes(1)
  })

  it('pre-warms the EditDoctorModal chunk on hover of "Modify", before the click lands', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])

    const loadEditDoctorModal = vi.fn(() => new Promise(() => {}))
    vi.doMock('@/features/pharma/components/EditDoctorModal', loadEditDoctorModal)
    vi.resetModules()
    const PharmaDoctorsTab = (await import('./PharmaDoctorsTab')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <PharmaDoctorsTab />
      </QueryClientProvider>,
    )
    await screen.findByText('Dr Ramesh Sharma')

    expect(loadEditDoctorModal).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.hover(screen.getByRole('button', { name: /modify/i }))
    expect(loadEditDoctorModal).toHaveBeenCalledTimes(1)
  })
})
