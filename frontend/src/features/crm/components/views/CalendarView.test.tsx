import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarView from '@/features/crm/components/views/CalendarView'
import type { LeadEntity } from '@/types/crm.types'

function leadFixture(overrides: Partial<LeadEntity> = {}): LeadEntity {
  return {
    id: 'lead-1',
    code: 'ld-000001',
    tenant: 'tenant-1',
    division: 'div-1',
    contactPerson: 'contact-1',
    focusTherapy: [],
    focusTherapyDoctor: [],
    title: 'Test Lead',
    problemStatement: '',
    numberOfMRS: 1,
    currentlyDoing: [],
    projectType: 'screening',
    offers: [],
    estimatedValue: 50000,
    followUpDate: new Date().toISOString(),
    confidence: 50,
    salesPerson: 'role-1',
    status: 'new',
    stageHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function getInMonthDayCell(dayNumber: string): HTMLElement {
  const candidates = screen.getAllByText(dayNumber).map((el) => el.closest('button')!)
  const inMonth = candidates.find((btn) => !btn.className.includes('opacity-45'))
  if (!inMonth) throw new Error(`No in-month cell found for day ${dayNumber}`)
  return inMonth
}

describe('CalendarView', () => {
  it('renders a lead chip on its follow-up day and opens the day modal on click', async () => {
    const user = userEvent.setup()
    const today = new Date()
    const lead = leadFixture({ title: 'Cardio screening follow-up', followUpDate: today.toISOString() })

    render(<CalendarView leads={[lead]} onOpen={vi.fn()} />)

    expect(screen.getByText('Cardio screening follow-up')).toBeInTheDocument()

    await user.click(getInMonthDayCell(String(today.getDate())))

    expect(screen.getByText('Close')).toBeInTheDocument()
    expect(screen.getAllByText('Cardio screening follow-up').length).toBeGreaterThan(1)
  })

  it('clicking a lead inside the day modal calls onOpen with that lead\'s id', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const today = new Date()
    const lead = leadFixture({ id: 'lead-42', title: 'Pick me', followUpDate: today.toISOString() })

    render(<CalendarView leads={[lead]} onOpen={onOpen} />)

    await user.click(getInMonthDayCell(String(today.getDate())))
    // "Pick me" now appears twice: the calendar chip and the modal row — the
    // modal row is the one rendered last and is an actual <button role>.
    const modalRow = screen.getAllByRole('button', { name: /Pick me/i }).at(-1)!
    await user.click(modalRow)

    expect(onOpen).toHaveBeenCalledWith('lead-42')
  })

  it('shows an undated-leads footer count for leads with no follow-up date', () => {
    const leads = [leadFixture({ id: 'a', followUpDate: undefined }), leadFixture({ id: 'b', followUpDate: undefined })]
    render(<CalendarView leads={leads} onOpen={vi.fn()} />)
    expect(screen.getByText(/2 leads with no follow-up date set/)).toBeInTheDocument()
  })

  it('counts a malformed (unparseable) follow-up date in the undated footer too, not just a missing one', () => {
    // Regression test: the footer count must come from MonthCalendarGrid's own
    // undated bucket (which catches malformed dates), not a separate
    // `!followUpDate` filter here that would miss a garbage-but-truthy string.
    const leads = [
      leadFixture({ id: 'a', followUpDate: undefined }),
      leadFixture({ id: 'b', followUpDate: 'not-a-real-date' }),
    ]
    render(<CalendarView leads={leads} onOpen={vi.fn()} />)
    expect(screen.getByText(/2 leads with no follow-up date set/)).toBeInTheDocument()
  })
})
