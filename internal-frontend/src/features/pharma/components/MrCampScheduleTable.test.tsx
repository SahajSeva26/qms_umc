import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MrCampScheduleTable from './MrCampScheduleTable'
import type { CampEntity } from '@/types/campReal.types'

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta', specialization: 'cardiologist' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' }, dietitian: null,
    mr: { _id: 'mr-1', code: 'mr-001', name: 'Amit Desai' }, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function renderTable(camps: CampEntity[], overrides: Partial<React.ComponentProps<typeof MrCampScheduleTable>> = {}) {
  const onOpenCamp = vi.fn()
  const onOpenDossier = vi.fn()
  const onRateCamp = vi.fn()
  render(<MrCampScheduleTable camps={camps} onOpenCamp={onOpenCamp} onOpenDossier={onOpenDossier} onRateCamp={onRateCamp} {...overrides} />)
  return { onOpenCamp, onOpenDossier, onRateCamp }
}

describe('MrCampScheduleTable', () => {
  it('renders the prototype\'s exact column set: Camp · Date, Type, Doctor, City, FO assigned, Status', () => {
    renderTable([campFixture()])

    expect(screen.getByRole('columnheader', { name: 'Camp · Date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FO assigned' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
  })

  it('shows the camp code, doctor name, city, and assigned FO', () => {
    renderTable([campFixture()])

    expect(screen.getByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByText('Dr. Aarav Mehta')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
  })

  it('shows the dietitian, not a stale FO, for a diet camp', () => {
    renderTable([campFixture({
      type: 'diet',
      fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
      dietitian: { _id: 'diet-1', code: 'diet-001', name: 'Anita Rao' },
    })])

    expect(screen.getByText('Anita Rao')).toBeInTheDocument()
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument()
  })

  it('clicking a row calls onOpenCamp with that camp', async () => {
    const { onOpenCamp } = renderTable([campFixture()])
    const user = userEvent.setup()

    await user.click(screen.getByText('cmp-000001'))

    expect(onOpenCamp).toHaveBeenCalledWith(expect.objectContaining({ id: 'camp-1' }))
  })

  it('shows View details and Open dossier actions for every camp, regardless of status', () => {
    renderTable([campFixture({ status: 'requested' })])

    expect(screen.getByTitle('View details')).toBeInTheDocument()
    expect(screen.getByTitle('Open full camp dossier')).toBeInTheDocument()
  })

  it('shows the Rate camp action only once the camp is closed', () => {
    renderTable([campFixture({ status: 'closed' })])

    expect(screen.getByTitle('Rate camp')).toBeInTheDocument()
  })

  it('hides the Rate camp action for a camp that is not yet closed', () => {
    renderTable([campFixture({ status: 'confirmed' })])

    expect(screen.queryByTitle('Rate camp')).not.toBeInTheDocument()
  })

  it('never shows Mark complete or Cancel — camp stage-move belongs to the FO, not the MR', () => {
    renderTable([campFixture({ status: 'confirmed' })])

    expect(screen.queryByTitle('Mark complete')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument()
  })

  it('clicking the Open dossier icon calls onOpenDossier without also triggering the row click', async () => {
    const { onOpenCamp, onOpenDossier } = renderTable([campFixture()])
    const user = userEvent.setup()

    await user.click(screen.getByTitle('Open full camp dossier'))

    expect(onOpenDossier).toHaveBeenCalledWith(expect.objectContaining({ id: 'camp-1' }))
    expect(onOpenCamp).not.toHaveBeenCalled()
  })
})
