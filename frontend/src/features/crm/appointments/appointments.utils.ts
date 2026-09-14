import { addDays } from '@/utils/calendarDate'

export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 22
export const HOUR_PX = 48

/** Hour row labels 08..21 — 14 rows covering 08:00–22:00 */
export const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)

/** Half-hour options 08:00 .. 22:00 for the create-meeting time selects */
export const TIME_OPTIONS = Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 2 + 1 }, (_, i) => {
  const h = DAY_START_HOUR + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`
})

/** Owner tone → solid dot color (matches the UserAvatar tone gradients) */
export const TONE_COLORS: Record<string, string> = {
  brand: 'var(--qms-brand)',
  teal: 'var(--qms-teal)',
  violet: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 24h clock 'HH:mm' from an ISO datetime */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatTimeRange(startAt: string, endAt: string): string {
  return `${formatTime(startAt)} – ${formatTime(endAt)}`
}

const DAY_MONTH = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

/** e.g. '07 Jul — 13 Jul 2026' */
export function formatWeekRange(weekStart: Date): string {
  return `${DAY_MONTH.format(weekStart)} — ${DAY_MONTH_YEAR.format(addDays(weekStart, 6))}`
}

/** e.g. 'September 2026' */
export function formatMonthLabel(cursor: Date): string {
  return MONTH_YEAR.format(cursor)
}

// Month view advances by a calendar month (snapped to day 1, sidestepping
// the "Jan 31 + 1 month" overflow into March); week/list still shift by
// exactly 7 days, matching the grids they actually render.
export function shiftCalendarCursor(cursor: Date, view: 'week' | 'month' | 'list', direction: 1 | -1): Date {
  if (view === 'month') {
    return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
  }
  return addDays(cursor, direction * 7)
}

