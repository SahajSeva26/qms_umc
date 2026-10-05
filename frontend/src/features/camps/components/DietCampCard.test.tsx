import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DietCampCard from './DietCampCard'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/hooks/useCampRefNames', () => ({
  useCampRefNames: () => ({
    doctorName: () => 'Dr. Aarav Mehta',
  }),
}))

function dietCampFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'diet', billingType: 'billable', patientExpectation: 40,
    fo: null, dietitian: { _id: 'die-1', code: 'die-001', name: 'Asha Rao' },
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

describe('DietCampCard', () => {
  it('renders code, tenant name, doctor, status pill and city/state', () => {
    render(<DietCampCard camp={dietCampFixture()} onOpen={vi.fn()} />)

    expect(screen.getByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByText('Migration Test Client')).toBeInTheDocument()
    expect(screen.getByText(/Dr\. Aarav Mehta/)).toBeInTheDocument()
    expect(screen.getByText(/Mumbai, Maharashtra/)).toBeInTheDocument()
    expect(screen.getByText('Requested')).toBeInTheDocument()
  })

  it('shows Expected/Done/Devices figures separately from patientExpectation/stats/devices', () => {
    render(<DietCampCard
      camp={dietCampFixture({ patientExpectation: 40, stats: { patients: 25, patientsCompleted: 10 }, devices: [{ _id: 'd1', name: 'Scale', code: 'dev-1', type: 'scale' }] })}
      onOpen={vi.fn()}
    />)

    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the dietitian team chip (last name only) when assigned', () => {
    render(<DietCampCard camp={dietCampFixture({ dietitian: { _id: 'die-1', code: 'die-001', name: 'Asha Rao' } })} onOpen={vi.fn()} />)

    expect(screen.getByText('Rao')).toBeInTheDocument()
    expect(screen.queryByText(/no dietitian/i)).not.toBeInTheDocument()
  })

  it('shows "No dietitian" when none is assigned', () => {
    render(<DietCampCard camp={dietCampFixture({ dietitian: null })} onOpen={vi.fn()} />)

    expect(screen.getByText(/no dietitian/i)).toBeInTheDocument()
  })

  it('shows the FO team chip when assigned, "No FO" when not', () => {
    const { rerender } = render(<DietCampCard camp={dietCampFixture({ fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' } })} onOpen={vi.fn()} />)
    expect(screen.getByText('Kumar')).toBeInTheDocument()

    rerender(<DietCampCard camp={dietCampFixture({ fo: null })} onOpen={vi.fn()} />)
    expect(screen.getByText(/no fo/i)).toBeInTheDocument()
  })

  it('calls onOpen with the camp id when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<DietCampCard camp={dietCampFixture()} onOpen={onOpen} />)

    await user.click(screen.getByText('cmp-000001'))
    expect(onOpen).toHaveBeenCalledWith('camp-1')
  })
})
