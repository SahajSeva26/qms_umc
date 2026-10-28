import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MrCampScheduleTable from './MrCampScheduleTable'
import type { CampEntity } from '@/types/campReal.types'

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, dietitian: null, mr: null, asm: null, rsm: null, date: '2026-09-15',
    timeSlot: '9am-1pm', location: null, devices: [], meta: null,
    status: 'closed', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

describe('MrCampScheduleTable — keyboard activation', () => {
  it('Enter/Space on the row itself opens the camp', async () => {
    const onOpenCamp = vi.fn()
    const user = userEvent.setup()
    render(<MrCampScheduleTable camps={[campFixture()]} onOpenCamp={onOpenCamp} onOpenDossier={vi.fn()} onRateCamp={vi.fn()} />)

    const row = screen.getByRole('button', { name: /cmp-000001/i })
    row.focus()
    await user.keyboard('{Enter}')

    expect(onOpenCamp).toHaveBeenCalledTimes(1)
  })

  // The row's own onKeyDown must not fire when a key press originates on a NESTED focusable
  // element (the dossier/view/rate icon buttons) and bubbles up — only a key press on the row
  // itself (event.target === event.currentTarget) should open the camp. Regression test for the
  // P2 finding: Enter/Space on a nested button used to also trigger onOpenCamp via bubbling, and
  // the row handler's own preventDefault() suppressed the nested button's native activation entirely.
  it('Enter on the nested "Open full camp dossier" button does NOT also trigger onOpenCamp via bubbling', async () => {
    const onOpenCamp = vi.fn()
    const onOpenDossier = vi.fn()
    const user = userEvent.setup()
    render(<MrCampScheduleTable camps={[campFixture()]} onOpenCamp={onOpenCamp} onOpenDossier={onOpenDossier} onRateCamp={vi.fn()} />)

    const dossierButton = screen.getByRole('button', { name: /open full camp dossier/i })
    dossierButton.focus()
    await user.keyboard('{Enter}')

    expect(onOpenDossier).toHaveBeenCalledTimes(1)
    expect(onOpenCamp).not.toHaveBeenCalled()
  })

  it('Space on the nested "View details" button does NOT also trigger the row\'s own onOpenCamp a second time', async () => {
    const onOpenCamp = vi.fn()
    const user = userEvent.setup()
    render(<MrCampScheduleTable camps={[campFixture()]} onOpenCamp={onOpenCamp} onOpenDossier={vi.fn()} onRateCamp={vi.fn()} />)

    const viewButton = screen.getByRole('button', { name: /view details/i })
    viewButton.focus()
    await user.keyboard(' ')

    expect(onOpenCamp).toHaveBeenCalledTimes(1)
  })

  it('Enter on the "Rate camp" button (shown only for a closed camp) does not bubble into the row handler either', async () => {
    const onOpenCamp = vi.fn()
    const onRateCamp = vi.fn()
    const user = userEvent.setup()
    render(<MrCampScheduleTable camps={[campFixture({ status: 'closed' })]} onOpenCamp={onOpenCamp} onOpenDossier={vi.fn()} onRateCamp={onRateCamp} />)

    const rateButton = screen.getByRole('button', { name: /rate camp/i })
    rateButton.focus()
    await user.keyboard('{Enter}')

    expect(onRateCamp).toHaveBeenCalledTimes(1)
    expect(onOpenCamp).not.toHaveBeenCalled()
  })
})
