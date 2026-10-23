import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RosterTab from './RosterTab'
import type { DoctorEntity } from '@/types/doctor.types'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'

const FILTERS: DoctorsFilterState = { search: '', specialization: 'ALL', status: 'ALL', city: '', state: '' }

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'd1',
    pharmaCode: 'doc-001',
    name: 'Dr. Aparna Joshi',
    specialization: undefined,
    status: 'active',
    location: null,
    ...overrides,
  } as DoctorEntity
}

function renderRoster(doctors: DoctorEntity[]) {
  return render(
    <RosterTab
      doctors={doctors}
      filters={FILTERS}
      setFilter={vi.fn()}
      reset={vi.fn()}
      onOpenDoctor={vi.fn()}
    />,
  )
}

describe('RosterTab — per-doctor Camps/Patients stats', () => {
  it('shows real numbers from stats when report=true data is present (matches DoctorDrawer\'s own reading of the same field)', () => {
    renderRoster([doctorFixture({ stats: { camps: 2, patients: 40, patientsCompleted: 35 } })])

    const card = screen.getByText('Dr. Aparna Joshi').closest('.doc-card')!
    expect(card).toHaveTextContent('2')
    expect(card).toHaveTextContent('35')
  })

  it('falls back to "—" for Camps/Patients when stats is absent (report flag was not set for this query)', () => {
    renderRoster([doctorFixture({ stats: undefined })])

    const card = screen.getByText('Dr. Aparna Joshi').closest('.doc-card')!
    const stats = card.querySelectorAll('.stat b')
    expect(stats[0]).toHaveTextContent('—') // Camps
    expect(stats[1]).toHaveTextContent('—') // Patients
  })

  it('Rx and star always show "—" — no backend field exists for either', () => {
    renderRoster([doctorFixture({ stats: { camps: 2, patients: 40, patientsCompleted: 35 } })])

    const card = screen.getByText('Dr. Aparna Joshi').closest('.doc-card')!
    const stats = card.querySelectorAll('.stat b')
    expect(stats[2]).toHaveTextContent('—') // Rx
    expect(stats[3]).toHaveTextContent('—') // star rating
  })
})
