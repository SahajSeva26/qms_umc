import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import PharmaDoctorsTab from './PharmaDoctorsTab'
import { useSession } from '@/hooks/useSession'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/hooks/useSession')

const { searchDoctors } = vi.hoisted(() => ({
  searchDoctors: vi.fn(async (): Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }> =>
    ({ success: true, message: '', data: { items: [], count: 0 } })),
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: { searchDoctors },
}))

vi.mock('@/features/doctors', () => ({
  EditDoctorModal: () => null,
}))

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'SUN-CP-2418', name: 'Dr Ramesh Sharma', specialization: 'cardiologist',
    mobile: '+919820011111', email: 'r.sharma@hotmail.com',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'MH', pincode: '400053', coordinates: [72.8, 19.0] },
    createdAt: '', updatedAt: '', tenant: 't-1',
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

describe('PharmaDoctorsTab — New doctor gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides "New doctor" with neither doctor:create nor doctor:manage', () => {
    mockSession([])
    renderTab()

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('shows "New doctor" for a session holding only doctor:create — the configured default for new pharma-mr role types', () => {
    mockSession(['doctor:create'])
    renderTab()

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })

  it('shows "New doctor" with doctor:manage too', () => {
    mockSession(['doctor:manage'])
    renderTab()

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })
})

describe('PharmaDoctorsTab — table rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a table with the prototype\'s exact column set', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Clinic address' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Camps' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Rx total' })).toBeInTheDocument()
  })

  it('requests report=true so the real per-doctor camps count is available, not a fake 0', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ report: 'true' }))
    expect(screen.getByText('2 camps')).toBeInTheDocument()
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

  it('"Rx total" is an honest placeholder, never a fabricated number — no Rx/prescription entity exists yet', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession(['doctor:manage'])
    renderTab()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
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
})
