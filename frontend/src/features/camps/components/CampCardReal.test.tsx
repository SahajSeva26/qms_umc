import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampCardReal from './CampCardReal'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/hooks/useCampRefNames', () => ({
  useCampRefNames: () => ({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    roleName: () => 'Ravi Kumar',
    projectName: () => 'Some Project',
  }),
}))

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
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

describe('CampCardReal', () => {
  it('renders code, type, doctor, city/state, status pill and time slot', () => {
    render(<CampCardReal camp={campFixture()} onOpen={vi.fn()} />)

    expect(screen.getByText('cmp-000001 · Screening')).toBeInTheDocument()
    expect(screen.getByText(/Dr\. Aarav Mehta/)).toBeInTheDocument()
    expect(screen.getByText(/Mumbai, Maharashtra/)).toBeInTheDocument()
    expect(screen.getByText('Requested')).toBeInTheDocument()
  })

  it('shows patient target and device count, "—" for Done when stats is absent (report=true not requested)', () => {
    render(<CampCardReal camp={campFixture({ devices: [{ _id: 'd1', name: 'BP Monitor', code: 'dev-1', type: 'bp' }] })} onOpen={vi.fn()} />)

    expect(screen.getByText('0/40')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows real patient/completed counts and a Done % once camp.stats is present', () => {
    render(<CampCardReal camp={campFixture({ stats: { patients: 25, patientsCompleted: 10 } })} onOpen={vi.fn()} />)

    expect(screen.getByText('10/25')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('falls back to patientExpectation when stats.patients is 0 (no screenings yet), still shows "—" for Done', () => {
    render(<CampCardReal camp={campFixture({ stats: { patients: 0, patientsCompleted: 0 } })} onOpen={vi.fn()} />)

    expect(screen.getByText('0/40')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows a "Missing FO" warning and an Assign FO action when no FO is assigned', () => {
    render(<CampCardReal camp={campFixture({ fo: null })} onOpen={vi.fn()} />)

    expect(screen.getByText('Missing FO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Assign FO/ })).toBeInTheDocument()
  })

  it('hides the Missing FO warning and Assign FO action when an FO is assigned', () => {
    render(<CampCardReal camp={campFixture()} onOpen={vi.fn()} />)

    expect(screen.queryByText('Missing FO')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Assign FO/ })).not.toBeInTheDocument()
  })

  it('calls onOpen when Details is clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<CampCardReal camp={campFixture()} onOpen={onOpen} />)

    await user.click(screen.getByRole('button', { name: /Details/ }))
    expect(onOpen).toHaveBeenCalledWith('camp-1')
  })
})
