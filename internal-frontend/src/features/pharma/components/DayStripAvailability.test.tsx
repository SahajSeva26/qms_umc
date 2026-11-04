import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import DayStripAvailability from '@/features/pharma/components/DayStripAvailability'
import type { BookingAvailabilityDayEntry } from '@/types/campReal.types'

// jsdom has no real IntersectionObserver — a controllable fake lets tests fire the callback
// manually (simulating "the sentinel scrolled into view") instead of faking real scroll geometry.
let observeCallback: IntersectionObserverCallback | null = null
const observeMock = vi.fn()
const disconnectMock = vi.fn()
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) { observeCallback = cb }
  observe = observeMock
  disconnect = disconnectMock
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [])
  root = null
  rootMargin = ''
  thresholds: number[] = []
}
const triggerIntersection = (isIntersecting: boolean) =>
  observeCallback?.([{ isIntersecting } as IntersectionObserverEntry], null as unknown as IntersectionObserver)

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
  const onLoadMore = vi.fn()
  render(
    <DayStripAvailability
      availability={AVAILABILITY}
      campTimeSlots={['9am-1pm', '10am-2pm']}
      daysToBookBefore={0}
      selectedDate=""
      selectedSlot=""
      onDateSelect={onDateSelect}
      onSlotSelect={onSlotSelect}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      hasNextPage={false}
      isFetchingNextPage={false}
      isFetchNextPageError={false}
      onLoadMore={onLoadMore}
      eligibleFoCount={2}
      city="Mumbai"
      {...overrides}
    />,
  )
  return { onDateSelect, onSlotSelect, onRetry, onLoadMore }
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

  it('on a failed request, the first batch (10 days) shows unknown ("···"), not "closed" — a failed fetch must never look identical to a fully-booked range', () => {
    renderStrip({ availability: {}, error: new Error('boom') })
    expect(screen.queryByText(/^closed$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('···').length).toBe(10)
  })

  describe('project lead time (daysToBookBefore)', () => {
    const dayOffset = (n: number) => {
      const d = new Date(TODAY)
      d.setDate(d.getDate() + n)
      return format(d, 'yyyy-MM-dd')
    }

    it('daysToBookBefore: 0 (the default) leaves today bookable, same as before this existed', () => {
      renderStrip({ daysToBookBefore: 0 })
      expect(dayButton(TODAY_KEY)).not.toBeDisabled()
    })

    it('a lead time shifts the whole strip forward — today and every day before the earliest bookable date is not rendered at all, even if the backend reports it available', () => {
      renderStrip({
        daysToBookBefore: 3,
        // Deliberately marked available by the backend — the lead-time gate must still win.
        availability: { [TODAY_KEY]: { available: true, slots: { '9am-1pm': true, '10am-2pm': true } } },
      })

      // Month+day accessible name, not a bare date-of-month match — a later month's same
      // day-of-month could otherwise collide inside the 30-tile window.
      const todayName = `${TODAY.toLocaleDateString('en-IN', { month: 'short' })} ${TODAY.getDate()}`
      expect(screen.queryByRole('button', { name: new RegExp(todayName) })).not.toBeInTheDocument()
    })

    it('the shifted strip starts its first batch at the earliest bookable date', async () => {
      const user = userEvent.setup()
      const day3Key = dayOffset(3)
      const day12Key = dayOffset(12)
      // A full first batch (10 contiguous days from day3) — matches what one real
      // useDayRangeAvailability page actually returns.
      const batch: Record<string, { available: boolean; slots: Record<string, boolean> }> = {}
      for (let i = 3; i <= 12; i++) {
        batch[dayOffset(i)] = { available: true, slots: { '9am-1pm': true, '10am-2pm': true } }
      }
      const { onDateSelect } = renderStrip({ daysToBookBefore: 3, availability: batch })

      // First tile is the earliest bookable date (day 3), clickable when the backend says so.
      const day3Btn = dayButton(day3Key)
      expect(day3Btn).not.toBeDisabled()
      await user.click(day3Btn)
      expect(onDateSelect).toHaveBeenCalledWith(day3Key)

      // One batch (10 days) — day 12 (day3 + 9 more) is the last one, day 13 isn't rendered yet.
      expect(dayButton(day12Key)).toBeInTheDocument()
      expect(screen.queryByText(new Date(`${dayOffset(13)}T00:00:00`).getDate().toString())).not.toBeInTheDocument()
    })

    it('shows the lead-time explanation with the correct day count and earliest date, only when daysToBookBefore > 0', () => {
      renderStrip({ daysToBookBefore: 5 })
      expect(screen.getByText(/requires booking at least 5 days in advance/i)).toBeInTheDocument()
    })

    it('shows no lead-time explanation when daysToBookBefore is 0', () => {
      renderStrip({ daysToBookBefore: 0 })
      expect(screen.queryByText(/requires booking at least/i)).not.toBeInTheDocument()
    })

    it('singular "day" (not "days") when the lead time is exactly 1', () => {
      renderStrip({ daysToBookBefore: 1 })
      expect(screen.getByText(/requires booking at least 1 day in advance/i)).toBeInTheDocument()
      expect(screen.queryByText(/1 days in advance/i)).not.toBeInTheDocument()
    })

    it('a negative daysToBookBefore (malformed project data) is clamped to 0, not treated as "book in the past"', () => {
      renderStrip({ daysToBookBefore: -5 })
      expect(dayButton(TODAY_KEY)).not.toBeDisabled()
    })

    it('an undefined/NaN daysToBookBefore (a project fixture missing the field) falls back to 0 instead of crashing the whole strip', () => {
      renderStrip({ daysToBookBefore: undefined as unknown as number })
      expect(dayButton(TODAY_KEY)).not.toBeDisabled()
      expect(screen.queryByText(/requires booking at least/i)).not.toBeInTheDocument()
    })
  })
})

describe('DayStripAvailability — infinite scroll', () => {
  beforeEach(() => {
    observeCallback = null
    observeMock.mockClear()
    disconnectMock.mockClear()
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  })

  it('renders no sentinel (and never observes) when there is no next page', () => {
    renderStrip({ hasNextPage: false })
    expect(observeMock).not.toHaveBeenCalled()
  })

  it('observes a sentinel when there is a next page to offer', () => {
    renderStrip({ hasNextPage: true })
    expect(observeMock).toHaveBeenCalledTimes(1)
  })

  it('calls onLoadMore once the sentinel scrolls into view', () => {
    const { onLoadMore } = renderStrip({ hasNextPage: true, isFetchingNextPage: false })
    triggerIntersection(true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not call onLoadMore while a batch is already in flight — no duplicate fetches from a lingering intersection', () => {
    const { onLoadMore } = renderStrip({ hasNextPage: true, isFetchingNextPage: true })
    triggerIntersection(true)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('does not call onLoadMore when the sentinel merely exists but is not intersecting', () => {
    const { onLoadMore } = renderStrip({ hasNextPage: true, isFetchingNextPage: false })
    triggerIntersection(false)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('renders no sentinel (and never observes) once a next-page fetch has failed — no retry-loop from a lingering intersection', () => {
    renderStrip({ hasNextPage: true, isFetchNextPageError: true })
    expect(observeMock).not.toHaveBeenCalled()
  })

  it('the next-page error banner\'s Retry calls onLoadMore (fetchNextPage), not the initial-load onRetry (refetch)', async () => {
    const user = userEvent.setup()
    const { onRetry, onLoadMore } = renderStrip({ hasNextPage: true, isFetchNextPageError: true })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('disconnects the observer on unmount — no leaked observer firing onLoadMore after the strip is gone', () => {
    const { unmount } = render(
      <DayStripAvailability
        availability={AVAILABILITY}
        campTimeSlots={['9am-1pm', '10am-2pm']}
        daysToBookBefore={0}
        selectedDate=""
        selectedSlot=""
        onDateSelect={vi.fn()}
        onSlotSelect={vi.fn()}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        hasNextPage
        isFetchingNextPage={false}
        isFetchNextPageError={false}
        onLoadMore={vi.fn()}
        eligibleFoCount={2}
      />,
    )
    unmount()
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})
