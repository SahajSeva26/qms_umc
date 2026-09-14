import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import DateSlotAvailabilityGrid from '@/features/pharma/components/DateSlotAvailabilityGrid'
import type { BookingAvailabilityDayEntry } from '@/types/campReal.types'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const TODAY = startOfToday()
const TODAY_KEY = format(TODAY, 'yyyy-MM-dd')
const TOMORROW = new Date(TODAY)
TOMORROW.setDate(TOMORROW.getDate() + 1)
const TOMORROW_KEY = format(TOMORROW, 'yyyy-MM-dd')

const AVAILABILITY: Record<string, BookingAvailabilityDayEntry> = {
  [TODAY_KEY]: { available: true, slots: { '9am-1pm': true, '10am-2pm': false } },
  [TOMORROW_KEY]: { available: false, slots: { '9am-1pm': false, '10am-2pm': false } },
}

function renderGrid(overrides: Partial<React.ComponentProps<typeof DateSlotAvailabilityGrid>> = {}) {
  const onDateSelect = vi.fn()
  const onSlotSelect = vi.fn()
  const onMonthChange = vi.fn()
  const onRetry = vi.fn()
  render(
    <DateSlotAvailabilityGrid
      availability={AVAILABILITY}
      campTimeSlots={['9am-1pm', '10am-2pm']}
      selectedDate=""
      selectedSlot=""
      onDateSelect={onDateSelect}
      onSlotSelect={onSlotSelect}
      month={TODAY}
      onMonthChange={onMonthChange}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      {...overrides}
    />,
  )
  return { onDateSelect, onSlotSelect, onMonthChange, onRetry }
}

// react-day-picker's default day button accessible name is the day-of-month
// number as plain text — scope by the exact day-of-month digit for today/tomorrow.
function dayButton(date: Date) {
  return screen.getByRole('gridcell', { name: String(date.getDate()) }).querySelector('button') as HTMLButtonElement
}

describe('DateSlotAvailabilityGrid', () => {
  it('an available day is clickable and calls onDateSelect with its YYYY-MM-DD key', async () => {
    const user = userEvent.setup()
    const { onDateSelect } = renderGrid()

    const todayBtn = dayButton(TODAY)
    expect(todayBtn).not.toBeDisabled()
    await user.click(todayBtn)
    expect(onDateSelect).toHaveBeenCalledWith(TODAY_KEY)
  })

  it('an unavailable day is genuinely non-clickable (disabled), not just styled', async () => {
    const user = userEvent.setup()
    const { onDateSelect } = renderGrid()

    const tomorrowBtn = dayButton(TOMORROW)
    expect(tomorrowBtn).toBeDisabled()
    await user.click(tomorrowBtn)
    expect(onDateSelect).not.toHaveBeenCalled()
  })

  it('a day with no entry in the availability map at all is also disabled, not silently clickable', () => {
    const dayAfterTomorrow = new Date(TODAY)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    renderGrid()
    expect(dayButton(dayAfterTomorrow)).toBeDisabled()
  })

  it('a day before today is not selectable (disabled, still shown as part of the current month grid)', () => {
    renderGrid()
    const priorDay = new Date(TODAY)
    priorDay.setDate(priorDay.getDate() - 1)
    if (priorDay.getMonth() === TODAY.getMonth()) {
      expect(dayButton(priorDay)).toBeDisabled()
    }
  })

  it('re-clicking the currently-selected day does not deselect it (required mode)', async () => {
    const user = userEvent.setup()
    const { onDateSelect } = renderGrid({ selectedDate: TODAY_KEY })

    const todayBtn = dayButton(TODAY)
    await user.click(todayBtn)
    // onDateSelect still fires with the same date — never called with undefined/empty.
    expect(onDateSelect).toHaveBeenCalledWith(TODAY_KEY)
  })

  it('the slot row only appears once a date is selected, showing only campTimeSlots-listed slots', () => {
    renderGrid({ selectedDate: TODAY_KEY })
    expect(screen.getByRole('button', { name: /9 AM – 1 PM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /10 AM – 2 PM/i })).toBeInTheDocument()
    expect(screen.queryByText(/11 AM – 3 PM/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/6 PM – 10 PM/i)).not.toBeInTheDocument()
  })

  it('no slot row renders before any date is selected', () => {
    renderGrid()
    expect(screen.queryByRole('button', { name: /9 AM – 1 PM/i })).not.toBeInTheDocument()
  })

  it('clicking an available slot pill calls onSlotSelect; an unavailable one is disabled', async () => {
    const user = userEvent.setup()
    const { onSlotSelect } = renderGrid({ selectedDate: TODAY_KEY })

    const availablePill = screen.getByRole('button', { name: /9 AM – 1 PM/i })
    await user.click(availablePill)
    expect(onSlotSelect).toHaveBeenCalledWith('9am-1pm')

    const unavailablePill = screen.getByRole('button', { name: /10 AM – 2 PM/i })
    expect(unavailablePill).toBeDisabled()
  })

  it('the calendar stays mounted and interactive when error is set — inline error + Retry, not a replacement', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderGrid({ error: new Error('boom') })

    expect(screen.getByText(/couldn't load availability/i)).toBeInTheDocument()
    // The calendar itself is still rendered — a day button is still present.
    expect(dayButton(TODAY)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the neutral "availability may change" caption, never overpromising a reservation', () => {
    renderGrid()
    expect(screen.getByText(/availability is checked when you choose a location and may change before confirmation/i)).toBeInTheDocument()
  })
})
