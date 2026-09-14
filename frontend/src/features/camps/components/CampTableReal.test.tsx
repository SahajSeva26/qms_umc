import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePermission } from '@/hooks/usePermission'
import CampTableReal from './CampTableReal'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampRefNames', () => ({
  useCampRefNames: () => ({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    roleName: () => 'Ravi Kumar',
  }),
}))

function mockSessionTenantType(type: 'platform' | 'customer') {
  vi.mocked(usePermission).mockReturnValue({
    session: { tenant: { type } },
  } as unknown as ReturnType<typeof usePermission>)
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

describe('CampTableReal', () => {
  it('renders Code, Schedule, Doctor, Location, FO, Status but no Company column for a tenant-scoped viewer', () => {
    mockSessionTenantType('customer')
    render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FO' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Company' })).not.toBeInTheDocument()
    // No independent Division or Slot columns — folded into Doctor/Schedule respectively.
    expect(screen.queryByRole('columnheader', { name: 'Division' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Slot' })).not.toBeInTheDocument()
  })

  it('shows the Company column for a platform-tenant viewer', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[campFixture()]} onOpen={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument()
    expect(screen.getByText('Migration Test Client')).toBeInTheDocument()
  })

  it('the Code cell is a real focusable, clickable control that opens the camp', async () => {
    mockSessionTenantType('platform')
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<CampTableReal camps={[campFixture()]} onOpen={onOpen} />)

    const codeButton = screen.getByRole('button', { name: 'cmp-000001' })
    codeButton.focus()
    expect(codeButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onOpen).toHaveBeenCalledWith('camp-1')
  })

  it('shows UNASSIGNED for a camp with no FO', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[campFixture({ fo: null })]} onOpen={vi.fn()} />)

    expect(screen.getByText('UNASSIGNED')).toBeInTheDocument()
  })

  it('shows the empty state when there are no camps', () => {
    mockSessionTenantType('platform')
    render(<CampTableReal camps={[]} onOpen={vi.fn()} />)

    expect(screen.getByText('No camps found.')).toBeInTheDocument()
  })
})
