import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { addDays, dayKey, isSameDay, startOfWeek } from '@/utils/calendarDate'

export interface MonthCalendarGridProps<T> {
  /** Caller-owned — this component has no month-nav UI or internal cursor state (see AppointmentMonthGrid's toolbar, which is shared across week/month/list views). */
  cursor: Date
  items: T[]
  /** null/undefined = "no date". A non-empty but unparseable string is also treated as undated, not dropped. */
  getDate: (item: T) => string | null | undefined
  /** Sort order within a day cell — defaults to insertion order. Must be a stable reference (see getDate). */
  sortKey?: (item: T) => string
  /** Content for a day's items, already sliced to maxVisiblePerDay. */
  renderDayItems: (items: T[], day: Date) => ReactNode
  onDayClick: (day: Date, items: T[]) => void
  formatCountBadge?: (count: number) => string
  /** Rendered only when provided and there's at least one undated item. */
  renderUndatedFooter?: (undatedItems: T[]) => ReactNode
  maxVisiblePerDay?: number
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseValidDate(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// getDate/sortKey MUST be stable references (module-level functions, or
// useCallback) for this memoization to do anything — a fresh inline lambda
// every render defeats it by changing the useMemo dependency every time.
function MonthCalendarGrid<T>({
  cursor,
  items,
  getDate,
  sortKey,
  renderDayItems,
  onDayClick,
  formatCountBadge,
  renderUndatedFooter,
  maxVisiblePerDay = 3,
}: MonthCalendarGridProps<T>) {
  const now = new Date()
  const cursorYear = cursor.getFullYear()
  const cursorMonth = cursor.getMonth()
  // Depend on primitives, not `cursor` itself — a fresh Date every render
  // (even for the same calendar month) would defeat this memoization.
  const cells = useMemo(() => {
    const gridStart = startOfWeek(new Date(cursorYear, cursorMonth, 1))
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [cursorYear, cursorMonth])

  const { byDay, undated } = useMemo(() => {
    const map = new Map<string, T[]>()
    const undatedItems: T[] = []
    for (const item of items) {
      const raw = getDate(item)
      const parsed = raw ? parseValidDate(raw) : null
      if (!parsed) {
        undatedItems.push(item)
        continue
      }
      const key = dayKey(parsed)
      const bucket = map.get(key)
      if (bucket) bucket.push(item)
      else map.set(key, [item])
    }
    if (sortKey) {
      for (const [key, dayItems] of map) {
        map.set(key, dayItems.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b))))
      }
    }
    return { byDay: map, undated: undatedItems }
  }, [items, getDate, sortKey])

  return (
    <div>
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: d === 'Sat' ? 'var(--warning)' : d === 'Sun' ? 'var(--danger)' : 'var(--qms-text-muted)' }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const inMonth = day.getMonth() === cursor.getMonth()
            const today = isSameDay(day, now)
            const weekday = day.getDay()
            const isSaturday = weekday === 6
            const isSunday = weekday === 0
            const dayItems = byDay.get(dayKey(day)) ?? []
            const visibleItems = dayItems.slice(0, maxVisiblePerDay)
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day, dayItems)}
                className={`min-h-[92px] p-1.5 text-left border-b border-r transition-colors hover:bg-(--qms-surface-hover) ${inMonth ? '' : 'opacity-45'}`}
                style={{
                  borderColor: 'var(--qms-border)',
                  background: today
                    ? 'rgba(59,109,255,.08)'
                    : isSaturday
                      ? 'color-mix(in srgb, var(--warning) 6%, transparent)'
                      : isSunday
                        ? 'color-mix(in srgb, var(--danger) 6%, transparent)'
                        : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: today ? 'var(--qms-brand)' : isSaturday ? 'var(--warning)' : isSunday ? 'var(--danger)' : 'var(--qms-text)' }}
                  >
                    {day.getDate()}
                  </span>
                  {dayItems.length > 0 && formatCountBadge && (
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                      {formatCountBadge(dayItems.length)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {renderDayItems(visibleItems, day)}
                  {dayItems.length > maxVisiblePerDay && (
                    <div className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                      +{dayItems.length - maxVisiblePerDay} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {renderUndatedFooter && undated.length > 0 && (
        <div className="mt-3">{renderUndatedFooter(undated)}</div>
      )}
    </div>
  )
}

export default MonthCalendarGrid
