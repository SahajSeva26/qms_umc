import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DoctorManagementPage from './DoctorManagementPage'
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
    createdAt: '', updatedAt: '', status: 'active',
    stats: { camps: 2, patients: 0, patientsCompleted: 0 },
    ...overrides,
  } as DoctorEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockSession(roleTypeCode: string, permissions: string[]) {
  vi.mocked(useSession).mockReturnValue({
    isSettled: true,
    isConfirmedUnauthenticated: false,
    session: { user: { id: 'u-1' }, role: { id: 'role-1', code: roleTypeCode, division: 'div-1' }, roleType: { code: roleTypeCode }, tenant: { id: 't-1', name: 'Tenant' }, permissions },
    permissions,
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => permissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => permissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
}

function renderPage() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <DoctorManagementPage />
    </QueryClientProvider>,
  )
}

describe('DoctorManagementPage — sidebar-level page for all four pharma roles, distinct from the MR portal\'s small Doctors tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks a non-pharma role-type via PharmaRoleGate', () => {
    mockSession('sales-rep', [])
    renderPage()

    expect(screen.getByText(/not available for your role/i)).toBeInTheDocument()
  })

  it('division-head (doctor:manage) sees the Inactive toggle, KPI tiles, and Status column', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession('pharma-division-head', ['doctor:manage'])
    renderPage()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByRole('button', { name: /show inactive/i })).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
  })

  it('RSM (no doctor:* permission) sees the list read-only — no Add doctor, no Modify, no Inactive toggle', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession('pharma-rsm', [])
    renderPage()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.queryByRole('button', { name: /add doctor/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /modify/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show inactive/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument()
  })

  it('ASM (no doctor:* permission) sees the same read-only list as RSM', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession('pharma-asm', [])
    renderPage()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.queryByRole('button', { name: /add doctor/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /modify/i })).not.toBeInTheDocument()
  })

  it('MR (doctor:create only) can Add but cannot Modify — matches the real doctor:manage-only PUT gate', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession('pharma-mr', ['doctor:create'])
    renderPage()

    await screen.findByText('Dr Ramesh Sharma')
    expect(screen.getByRole('button', { name: /add doctor/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /modify/i })).not.toBeInTheDocument()
  })

  it('requests status=inactive only once the toggle is on, and only for a session that can see inactive', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession('pharma-division-head', ['doctor:manage'])
    renderPage()
    await vi.waitFor(() => expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ status: undefined })))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /show inactive/i }))

    await vi.waitFor(() => expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' })))
  })

  it('opens the detail drawer on clicking a doctor row', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [doctorFixture()], count: 1 } })
    mockSession('pharma-division-head', ['doctor:manage'])
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByText('Dr Ramesh Sharma'))

    expect(await screen.findByRole('heading', { name: /dr ramesh sharma · sun-cp-2418/i })).toBeInTheDocument()
  })

  it('scopes the search to the session\'s own division, same as the MR tab', async () => {
    searchDoctors.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession('pharma-division-head', ['doctor:manage'])
    renderPage()

    await vi.waitFor(() => expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ division: 'div-1' })))
  })
})
