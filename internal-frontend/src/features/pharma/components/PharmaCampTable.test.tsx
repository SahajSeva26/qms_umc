import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PharmaCampTable from './PharmaCampTable'
import type { CampEntity } from '@/types/campReal.types'

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' }, type: 'diet', billingType: 'billable', patientExpectation: 40,
    fo: null, dietitian: null, mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' }, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411001', coordinates: [73.85, 18.52] },
    devices: [], notes: '', status: 'confirmed', stageHistory: [],
    createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
  } as CampEntity
}

describe('PharmaCampTable', () => {
  it('shows a Type column with the camp\'s actual type, not just Code/Doctor/Date/Location/MR/Status', () => {
    render(<PharmaCampTable camps={[campFixture({ type: 'diet' })]} />)

    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByText('Diet')).toBeInTheDocument()
  })

  it('a screening camp\'s Type cell reads "Screening", not "Diet"', () => {
    render(<PharmaCampTable camps={[campFixture({ type: 'screening' })]} />)

    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.queryByText('Diet')).not.toBeInTheDocument()
  })
})
