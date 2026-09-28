import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DivisionDoctorsSection from './DivisionDoctorsSection'
import { usePermission } from '@/hooks/usePermission'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/hooks/useDoctorSearch')

function mockPermission(canManage: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: (code: string) => canManage && code === 'doctor:manage',
  } as unknown as ReturnType<typeof usePermission>)
}

function makeDoctor(id: string, overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id,
    pharmaCode: `PC-${id}`,
    name: `Dr ${id}`,
    specialization: 'cp',
    mobile: '9999999999',
    email: `${id}@example.com`,
    location: { addressLine1: '', city: 'Pune', state: 'Maharashtra', pincode: '', coordinates: [0, 0] },
    createdAt: '',
    updatedAt: '',
    status: 'active',
    tenant: 't-1',
    ...overrides,
  }
}

function mockSearch(items: DoctorEntity[], extra: Partial<ReturnType<typeof useDoctorSearch>> = {}) {
  vi.mocked(useDoctorSearch).mockReturnValue({
    data: { success: true, message: '', data: { count: items.length, items } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...extra,
  } as unknown as ReturnType<typeof useDoctorSearch>)
}

describe('DivisionDoctorsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls useDoctorSearch scoped to {tenant, division}', () => {
    mockPermission(true)
    mockSearch([])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(useDoctorSearch).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 't-1', division: 'd-1' }),
      expect.objectContaining({ enabled: true }),
    )
  })

  it('maps the "all" status sentinel to undefined, never sending the literal string "all"', () => {
    mockPermission(true)
    mockSearch([])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(useDoctorSearch).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
      expect.anything(),
    )
  })

  it('renders the loaded doctors in the table', () => {
    mockPermission(true)
    mockSearch([makeDoctor('1', { name: 'Dr Alpha' }), makeDoctor('2', { name: 'Dr Beta' })])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(screen.getByText('Dr Alpha')).toBeInTheDocument()
    expect(screen.getByText('Dr Beta')).toBeInTheDocument()
  })

  it('shows the loading state via QueryStateBlock', () => {
    mockPermission(true)
    mockSearch([], { isLoading: true })
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(screen.getByText(/loading doctors/i)).toBeInTheDocument()
  })

  it('shows the error state with a retry action', async () => {
    mockPermission(true)
    const refetch = vi.fn()
    mockSearch([], { error: new Error('boom'), refetch })
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(screen.getByText(/failed to load doctors/i)).toBeInTheDocument()
  })

  it('a non-doctor:manage actor never sees the Inactive/All status control', () => {
    mockPermission(false)
    mockSearch([])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('a doctor:manage actor DOES see the status control, defaulting to All', () => {
    mockPermission(true)
    mockSearch([])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('clicking a doctor row opens the detail drawer', async () => {
    mockPermission(true)
    mockSearch([makeDoctor('1', { name: 'Dr Alpha' })])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    const user = userEvent.setup()
    await user.click(screen.getByText('Dr Alpha'))

    // The drawer renders its own "Close" text button (distinct from SideDrawer's icon-only
    // "Close" button) plus a "Contact & address" heading only the drawer itself renders.
    await waitFor(() => expect(screen.getByText(/contact & address/i)).toBeInTheDocument())
  })

  it('typing in the search box narrows the query (debounced)', async () => {
    mockPermission(true)
    mockSearch([])
    render(<DivisionDoctorsSection tenantId="t-1" divisionId="d-1" />)

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search by name/i), 'Alp')

    await waitFor(() =>
      expect(useDoctorSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Alp' }),
        expect.anything(),
      ),
    )
  })
})
