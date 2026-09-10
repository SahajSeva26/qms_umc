import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppointmentMonthGrid from '@/features/crm/appointments/components/AppointmentMonthGrid'
import type { AppointmentEntity } from '@/types/appointment.types'

function appointmentFixture(overrides: Partial<AppointmentEntity> = {}): AppointmentEntity {
  return {
    id: 'apt-1',
    code: 'apt-000001',
    tenant: 'tenant-1',
    division: 'div-1',
    type: 'new',
    salesPerson: 'role-1',
    contactPerson: 'contact-1',
    internalMembers: [],
    mode: 'online',
    duration: { startTime: '2026-09-09T10:00:00.000Z' },
    agenda: {},
    status: 'planned',
    mom: {},
    stageHistory: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function getInMonthDayCell(dayNumber: string): HTMLElement {
  const candidates = screen.getAllByText(dayNumber).map((el) => el.closest('button')!)
  const inMonth = candidates.find((btn) => !btn.className.includes('opacity-45'))
  if (!inMonth) throw new Error(`No in-month cell found for day ${dayNumber}`)
  return inMonth
}

describe('AppointmentMonthGrid', () => {
  it('renders a color bar for an appointment on its start-time day', () => {
    const appointment = appointmentFixture({ duration: { startTime: '2026-09-09T10:00:00.000Z' } })
    render(<AppointmentMonthGrid cursor={new Date(2026, 8, 1)} appointments={[appointment]} onPickDate={vi.fn()} />)

    const dayCell = getInMonthDayCell('9')
    expect(dayCell.querySelector('.h-1.rounded-full')).toBeInTheDocument()
  })

  it('clicking a day calls onPickDate with that date (no modal — Appointments navigates instead)', async () => {
    const user = userEvent.setup()
    const onPickDate = vi.fn()
    render(<AppointmentMonthGrid cursor={new Date(2026, 8, 1)} appointments={[]} onPickDate={onPickDate} />)

    await user.click(getInMonthDayCell('15'))

    expect(onPickDate).toHaveBeenCalledTimes(1)
    expect(onPickDate.mock.calls[0][0].getDate()).toBe(15)
    // No day-detail modal exists on this component — confirm nothing resembling one opened.
    expect(screen.queryByText('Close')).not.toBeInTheDocument()
  })

  // Regression guard for the exact drift that motivated the shared-component
  // extraction: weekend coloring was added to the Leads calendar but never
  // ported here — now both come from the same MonthCalendarGrid, so this
  // should hold without any Appointments-specific code.
  it('colors Saturday and Sunday cells — the fix this refactor was built to close', () => {
    // September 2026: 5th=Sat, 6th=Sun.
    render(<AppointmentMonthGrid cursor={new Date(2026, 8, 1)} appointments={[]} onPickDate={vi.fn()} />)

    const satCell = getInMonthDayCell('5')
    const sunCell = getInMonthDayCell('6')
    expect(satCell.style.background).toContain('var(--warning)')
    expect(sunCell.style.background).toContain('var(--danger)')

    const satHeader = screen.getByText('Sat')
    const sunHeader = screen.getByText('Sun')
    expect(satHeader).toHaveStyle({ color: 'var(--warning)' })
    expect(sunHeader).toHaveStyle({ color: 'var(--danger)' })
  })
})
