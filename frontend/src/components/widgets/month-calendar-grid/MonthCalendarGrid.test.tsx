import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthCalendarGrid from '@/components/widgets/month-calendar-grid/MonthCalendarGrid'

// The 42-cell grid can show the same day-of-month number twice (once for the
// in-month cell, once for a leading/trailing adjacent-month cell) — always
// scope to the in-month one via the absence of the dimming class.
function getInMonthDayCell(dayNumber: string): HTMLElement {
  const candidates = screen.getAllByText(dayNumber).map((el) => el.closest('button')!)
  const inMonth = candidates.find((btn) => !btn.className.includes('opacity-45'))
  if (!inMonth) throw new Error(`No in-month cell found for day ${dayNumber}`)
  return inMonth
}

interface Item {
  id: string
  date: string | null
}

const getDate = (item: Item) => item.date
const sortKey = (item: Item) => item.date ?? ''

function renderGrid(props: Partial<React.ComponentProps<typeof MonthCalendarGrid<Item>>> = {}) {
  const onDayClick = vi.fn()
  const renderDayItems = (items: Item[]) => (
    <>
      {items.map((i) => (
        <div key={i.id} data-testid={`item-${i.id}`}>{i.id}</div>
      ))}
    </>
  )
  render(
    <MonthCalendarGrid<Item>
      cursor={new Date(2026, 8, 1)}
      items={[]}
      getDate={getDate}
      onDayClick={onDayClick}
      renderDayItems={renderDayItems}
      {...props}
    />,
  )
  return { onDayClick }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MonthCalendarGrid', () => {
  it('renders a 42-cell Monday-first grid with the correct weekday header order', () => {
    renderGrid()
    const headers = screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
    expect(headers.map((h) => h.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('buckets items by date and renders them in the correct day cell', () => {
    renderGrid({ items: [{ id: 'a', date: '2026-09-09T10:00:00.000Z' }] })
    expect(screen.getByTestId('item-a')).toBeInTheDocument()
  })

  it('excludes null dates from any day cell and routes them to the undated bucket', () => {
    const items: Item[] = [{ id: 'a', date: null }]
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        onDayClick={vi.fn()}
        renderDayItems={(dayItems) => <>{dayItems.map((i) => <div key={i.id}>{i.id}</div>)}</>}
        renderUndatedFooter={(undated) => <p data-testid="undated-footer">{undated.length} undated</p>}
      />,
    )
    expect(screen.getByTestId('undated-footer')).toHaveTextContent('1 undated')
  })

  it('treats a malformed (unparseable) date string the same as undated, not silently dropped', () => {
    const items: Item[] = [{ id: 'bad', date: 'not-a-real-date' }]
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        onDayClick={vi.fn()}
        renderDayItems={(dayItems) => <>{dayItems.map((i) => <div key={i.id}>{i.id}</div>)}</>}
        renderUndatedFooter={(undated) => <p data-testid="undated-footer">{undated.length} undated</p>}
      />,
    )
    expect(screen.getByTestId('undated-footer')).toHaveTextContent('1 undated')
  })

  it('does not render an undated footer when none is provided', () => {
    renderGrid({ items: [{ id: 'a', date: null }] })
    expect(screen.queryByTestId('undated-footer')).not.toBeInTheDocument()
  })

  it('sorts items within a day cell by sortKey', () => {
    const items: Item[] = [
      { id: 'later', date: '2026-09-09T18:00:00' },
      { id: 'earlier', date: '2026-09-09T08:00:00' },
    ]
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        sortKey={sortKey}
        onDayClick={vi.fn()}
        renderDayItems={(dayItems) => <>{dayItems.map((i) => <div key={i.id} data-testid="sorted-item">{i.id}</div>)}</>}
      />,
    )
    const rendered = screen.getAllByTestId('sorted-item')
    expect(rendered.map((el) => el.textContent)).toEqual(['earlier', 'later'])
  })

  it('slices to maxVisiblePerDay and shows a "+N more" overflow line', () => {
    const items: Item[] = Array.from({ length: 5 }, (_, i) => ({ id: `item-${i}`, date: '2026-09-09T10:00:00' }))
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        maxVisiblePerDay={3}
        onDayClick={vi.fn()}
        renderDayItems={(dayItems) => <>{dayItems.map((i) => <div key={i.id} data-testid="visible-item">{i.id}</div>)}</>}
      />,
    )
    expect(screen.getAllByTestId('visible-item')).toHaveLength(3)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('formats and shows the count badge only when formatCountBadge is provided', () => {
    const items: Item[] = [{ id: 'a', date: '2026-09-09T10:00:00' }]
    const { rerender } = render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        onDayClick={vi.fn()}
        renderDayItems={() => null}
      />,
    )
    expect(screen.queryByText(/1 item/)).not.toBeInTheDocument()

    rerender(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={items}
        getDate={getDate}
        formatCountBadge={(n) => `${n} item${n === 1 ? '' : 's'}`}
        onDayClick={vi.fn()}
        renderDayItems={() => null}
      />,
    )
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('fires onDayClick with the clicked day and that day\'s items', async () => {
    const user = userEvent.setup()
    const items: Item[] = [{ id: 'a', date: '2026-09-09T10:00:00' }]
    const { onDayClick } = renderGrid({ items, renderDayItems: () => null })

    await user.click(getInMonthDayCell('9'))

    expect(onDayClick).toHaveBeenCalledTimes(1)
    const [day, dayItems] = onDayClick.mock.calls[0]
    expect(day.getDate()).toBe(9)
    expect(dayItems).toEqual(items)
  })

  it('fires onDayClick with an empty array for a day with no items', async () => {
    const user = userEvent.setup()
    const { onDayClick } = renderGrid()

    await user.click(getInMonthDayCell('15'))

    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date), [])
  })

  it('highlights today independent of weekend coloring', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 9)) // a Wednesday
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={[]}
        getDate={getDate}
        onDayClick={vi.fn()}
        renderDayItems={() => null}
      />,
    )
    const todayCell = getInMonthDayCell('9')
    expect(todayCell).toHaveStyle({ background: 'rgba(59,109,255,.08)' })
  })

  it('dims out-of-month cells', () => {
    render(
      <MonthCalendarGrid<Item>
        cursor={new Date(2026, 8, 1)}
        items={[]}
        getDate={getDate}
        onDayClick={vi.fn()}
        renderDayItems={() => null}
      />,
    )
    // Aug 31 (the trailing-month cell filling the first row before Sep 1) is out-of-month.
    const trailingCell = screen.getByText('31').closest('button')
    expect(trailingCell?.className).toContain('opacity-45')
  })
})
