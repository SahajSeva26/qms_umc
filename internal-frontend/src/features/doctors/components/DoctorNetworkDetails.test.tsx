import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useRoleTypes, useRoles } from '@/features/access-management'
import { useCampsReal } from '@/features/camps'
import DoctorNetworkDetails from './DoctorNetworkDetails'

vi.mock('@/features/access-management', () => ({
  useRoleTypes: vi.fn(),
  useRoles: vi.fn(),
}))

vi.mock('@/features/camps', () => ({
  useCampsReal: vi.fn(),
}))

const idleQuery = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}

describe('DoctorNetworkDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoleTypes).mockReturnValue({
      ...idleQuery,
      data: { success: true, message: '', data: { count: 1, items: [{ id: 'rt-mr', code: 'pharma-mr' }] } },
    } as unknown as ReturnType<typeof useRoleTypes>)
    vi.mocked(useRoles).mockReturnValue({
      ...idleQuery,
      data: {
        success: true,
        message: '',
        data: {
          count: 1,
          items: [{
            id: 'role-mr-1',
            code: 'mr-0001',
            name: 'Pharma MR role',
            permissions: [],
            status: 'active',
            type: { id: 'rt-mr', code: 'pharma-mr', name: 'Pharma MR' },
            user: { firstName: 'Rachna', lastName: 'Gupta', email: 'rachna@example.com', phone: '9988776655' },
            tenant: { name: 'Abbott India', code: 'abbott' },
            division: { name: 'Cardio Excellence', code: 'cardio' },
            createdAt: '',
            updatedAt: '',
          }],
        },
      },
    } as unknown as ReturnType<typeof useRoles>)
    vi.mocked(useCampsReal).mockReturnValue({
      ...idleQuery,
      data: {
        success: true,
        message: '',
        data: {
          count: 1,
          items: [{
            id: 'camp-1',
            code: 'C-9456',
            tenant: 'tenant-1',
            division: 'division-1',
            project: null,
            doctor: 'doctor-1',
            type: 'diet',
            billingType: 'billable',
            patientExpectation: 50,
            fo: null,
            dietitian: null,
            mr: null,
            asm: null,
            rsm: null,
            date: '2026-11-06T00:00:00.000Z',
            timeSlot: null,
            location: { addressLine1: '', city: 'Delhi', state: 'Delhi', pincode: '110001', coordinates: [77, 28] },
            devices: [],
            meta: null,
            status: 'confirmed',
            stageHistory: [],
            createdAt: '',
            updatedAt: '',
            stats: { patients: 44, patientsCompleted: 40 },
          }],
        },
      },
    } as unknown as ReturnType<typeof useCampsReal>)
  })

  it('renders the real company/division, same-division MRs, and doctor camp history', () => {
    render(
      <DoctorNetworkDetails
        doctorId="doctor-1"
        tenantId="tenant-1"
        tenantName="Abbott India"
        divisionId="division-1"
        divisionName="Cardio Excellence"
        totalCamps={3}
        canViewMrs
        canViewCamps
      />,
    )

    expect(screen.getByText('Abbott India')).toBeInTheDocument()
    expect(screen.getByText('Cardio Excellence')).toBeInTheDocument()
    expect(screen.getByText('Not recorded')).toBeInTheDocument()
    expect(screen.getByText('Rachna Gupta')).toBeInTheDocument()
    expect(screen.getByText('C-9456')).toBeInTheDocument()
    expect(screen.getByText('40/50')).toBeInTheDocument()

    expect(useRoleTypes).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'pharma-mr', tenant: 'tenant-1', status: 'active' }),
      true,
    )
    expect(useRoles).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 'tenant-1', division: 'division-1', type: 'rt-mr', status: 'active' }),
      true,
    )
    expect(useCampsReal).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: 'doctor-1', report: 'true' }),
      true,
    )
  })

  it('keeps unauthorized related-data requests disabled and explains the unavailable sections', () => {
    render(
      <DoctorNetworkDetails
        doctorId="doctor-1"
        tenantId="tenant-1"
        tenantName="Abbott India"
        divisionId="division-1"
        divisionName="Cardio Excellence"
        canViewMrs={false}
        canViewCamps={false}
      />,
    )

    expect(useRoleTypes).toHaveBeenCalledWith(expect.anything(), false)
    expect(useRoles).toHaveBeenCalledWith(expect.anything(), false)
    expect(useCampsReal).toHaveBeenCalledWith(expect.anything(), false)
    expect(screen.getByText(/MR coverage is unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Camp history is unavailable/i)).toBeInTheDocument()
  })
})

