import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PharmaCampDetailDrawer from './PharmaCampDetailDrawer'
import type { CampEntity } from '@/types/campReal.types'

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    dietitian: null,
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

describe('PharmaCampDetailDrawer', () => {
  it('labels the staffing row "Field Officer" and shows the FO name for a screening camp', () => {
    render(<PharmaCampDetailDrawer camp={campFixture()} onClose={vi.fn()} />)

    expect(screen.getByText('Field Officer')).toBeInTheDocument()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.queryByText('Dietitian')).not.toBeInTheDocument()
  })

  it('a diet camp labels the staffing row "Dietitian" and shows the dietitian name, not a stale FO', () => {
    render(
      <PharmaCampDetailDrawer
        camp={campFixture({ type: 'diet', fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' }, dietitian: { _id: 'diet-1', code: 'diet-001', name: 'Anita Rao' } })}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Dietitian')).toBeInTheDocument()
    expect(screen.getByText('Anita Rao')).toBeInTheDocument()
    expect(screen.queryByText('Field Officer')).not.toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('a diet camp with no dietitian shows "Not yet assigned", even with a stale camp.fo present', () => {
    render(
      <PharmaCampDetailDrawer
        camp={campFixture({ type: 'diet', fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' }, dietitian: null })}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Dietitian')).toBeInTheDocument()
    expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })
})
