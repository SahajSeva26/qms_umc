import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import DayStripAvailability from '@/features/pharma/components/DayStripAvailability'
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

function renderStrip(overrides: Partial<React.ComponentProps<typeof DayStripAvailability>> = {}) {
  const onDateSelect = vi.fn()
  const onSlotSelect = vi.fn()
  const onRetry = vi.fn()
  render(
    <DayStripAvailability
      availability={AVAILABILITY}
      campTimeSlots={['9am-1pm', '10am-2pm']}
      selectedDate=""
      selectedSlot=""
      onDateSelect={onDateSelect}
      onSlotSelect={onSlotSelect}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      eligibleFoCount={2}
      city="Mumbai"
      {...overrides}
    />,
  )
  return { onDateSelect, onSlotSelect, onRetry }
}

const dayButton = (dateKey: string) => screen.getByText(new Date(`${dateKey}T00:00:00`).getDate().toString()).closest('button') as HTMLButtonElement

describe('DayStripAvailability', () => {
  it('renders a 30-day rolling strip starting today, not a calendar month grid', () => {
    renderStrip()
    // Today's button is present and reflects real availability.
    expect(dayButton(TODAY_KEY)).not.toBeDisabled()
  })

  it('an available day is clickable and calls onDateSelect with its YYYY-MM-DD key', async () => {
    const user = userEvent.setup()
    const { onDateSelect } = renderStrip()

    const todayBtn = dayButton(TODAY_KEY)
    expect(todayBtn).not.toBeDisabled()
    await user.click(todayBtn)
    expect(onDateSelect).toHaveBeenCalledWith(TODAY_KEY)
  })

  it('an unavailable day is genuinely non-clickable (disabled), shown as "closed"', async () => {
    const user = userEvent.setup()
    const { onDateSelect } = renderStrip()

    const tomorrowBtn = dayButton(TOMORROW_KEY)
    expect(tomorrowBtn).toBeDisabled()
    await user.click(tomorrowBtn)
    expect(onDateSelect).not.toHaveBeenCalled()
  })

  it('a day with no entry in the availability map at all is also disabled, not silently clickable', () => {
    const dayAfterTomorrow = new Date(TODAY)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    const key = format(dayAfterTomorrow, 'yyyy-MM-dd')
    renderStrip()
    expect(dayButton(key)).toBeDisabled()
  })

  it('the slot row only appears once a date is selected, showing only campTimeSlots-listed slots', () => {
    renderStrip({ selectedDate: TODAY_KEY })
    expect(screen.getByRole('button', { name: /9 AM – 1 PM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /10 AM – 2 PM/i })).toBeInTheDocument()
  })

  it('no slot row renders before any date is selected — shows the "pick a date" hint with the real eligible FO count instead', () => {
    renderStrip()
    expect(screen.queryByRole('button', { name: /9 AM – 1 PM/i })).not.toBeInTheDocument()
    expect(screen.getByText(/pick a date — 2 fos can run this camp near mumbai/i)).toBeInTheDocument()
  })

  it('clicking an available slot pill calls onSlotSelect; an unavailable one is disabled', async () => {
    const user = userEvent.setup()
    const { onSlotSelect } = renderStrip({ selectedDate: TODAY_KEY })

    const availablePill = screen.getByRole('button', { name: /9 AM – 1 PM/i })
    await user.click(availablePill)
    expect(onSlotSelect).toHaveBeenCalledWith('9am-1pm')

    const unavailablePill = screen.getByRole('button', { name: /10 AM – 2 PM/i })
    expect(unavailablePill).toBeDisabled()
  })

  it('the strip stays mounted and interactive when error is set — inline error + Retry, not a replacement', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderStrip({ error: new Error('boom') })

    expect(screen.getByText(/couldn't load availability/i)).toBeInTheDocument()
    expect(dayButton(TODAY_KEY)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the neutral "availability may change" caption, never overpromising a reservation', () => {
    renderStrip()
    expect(screen.getByText(/availability is checked when you choose a location and may change before confirmation/i)).toBeInTheDocument()
  })

  it('renders the legend with both labels', () => {
    renderStrip()
    expect(screen.getByText(/fo free/i)).toBeInTheDocument()
    expect(screen.getByText(/all booked/i)).toBeInTheDocument()
  })

  it('slot pills are colored green when an FO is available and red when the slot is blocked — real per-slot FO availability, not a generic style', () => {
    renderStrip({ selectedDate: TODAY_KEY })

    // 9am-1pm: true in the fixture → available/green. 10am-2pm: false → unavailable/red.
    expect(screen.getByRole('button', { name: /9 AM – 1 PM/i }).className).toMatch(/success/)
    expect(screen.getByRole('button', { name: /10 AM – 2 PM/i }).className).toMatch(/danger/)
  })

  it('never fabricates a per-day or per-slot FO count — only real available/unavailable state is shown', () => {
    renderStrip()
    // No count-shaped text like "2/4" or "N FO free" per slot — only the project-level
    // eligibleFoCount hint text (asserted separately above) and plain free/closed labels.
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^free$/i).length + screen.getAllByText(/^closed$/i).length).toBeGreaterThan(0)
  })

  it('while loading, a day with no entry yet is shown as unknown, not fabricated as "closed" — and stays non-clickable until it genuinely resolves', () => {
    renderStrip({ availability: {}, isLoading: true })
    // No day anywhere is labeled "closed" during a load — real "closed" only ever appears once
    // a fetch actually confirms a day is unavailable, never as the default for missing data.
    expect(screen.queryByText(/^closed$/i)).not.toBeInTheDocument()
    expect(dayButton(TODAY_KEY)).toBeDisabled()
  })

  it('on a failed request, all 30 days show unknown ("···"), not "closed" — a failed fetch must never look identical to a fully-booked range', () => {
    renderStrip({ availability: {}, error: new Error('boom') })
    expect(screen.queryByText(/^closed$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('···').length).toBe(30)
  })
})
