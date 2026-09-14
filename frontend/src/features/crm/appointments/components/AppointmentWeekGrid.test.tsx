import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppointmentWeekGrid from '@/features/crm/appointments/components/AppointmentWeekGrid'

describe('AppointmentWeekGrid', () => {
  it('colors the Saturday and Sunday day-header cells, matching the Month view treatment', () => {
    // Mon 7 Sep 2026 — Sun 13 Sep 2026: Sat=12, Sun=13.
    render(
      <AppointmentWeekGrid
        weekStart={new Date(2026, 8, 7)}
        appointments={[]}
        onOpen={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    )

    const satHeader = screen.getByText('Sat')
    const sunHeader = screen.getByText('Sun')
    expect(satHeader).toHaveStyle({ color: 'var(--warning)' })
    expect(sunHeader).toHaveStyle({ color: 'var(--danger)' })

    const satDateCell = screen.getByText('12')
    const sunDateCell = screen.getByText('13')
    expect(satDateCell).toHaveStyle({ color: 'var(--warning)' })
    expect(sunDateCell).toHaveStyle({ color: 'var(--danger)' })
  })
})
