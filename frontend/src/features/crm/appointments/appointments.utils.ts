import type { Meeting } from '@/types/meeting.types'
import { MEETING_STATUS_META, MEETING_TYPE_META } from '@/types/meeting.types'

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

/** Monday-first start of week, local midnight */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Local-timezone YYYY-MM-DD key, for bucketing meetings into day columns */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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

/** e.g. '07 Jul — 13 Jul 2026' */
export function formatWeekRange(weekStart: Date): string {
  return `${DAY_MONTH.format(weekStart)} — ${DAY_MONTH_YEAR.format(addDays(weekStart, 6))}`
}

/** ISO datetime → 'YYYY-MM-DDTHH:mm' local value for <input type="datetime-local"> */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Calendar chip background: type color, overridden by status color once no longer PLANNED */
export function chipColor(m: Meeting): string {
  return m.status === 'PLANNED' ? MEETING_TYPE_META[m.type].color : MEETING_STATUS_META[m.status].color
}

/** Darker shade of a #rrggbb color, used for the chip's left border */
export function darken(hex: string, factor = 0.72): string {
  const n = hex.replace('#', '')
  const channel = (i: number) => pad2(Math.round(parseInt(n.slice(i, i + 2), 16) * factor).toString(16))
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

const pad2 = (s: string) => (s.length < 2 ? `0${s}` : s)

/**
 * Simple 24 clock-hour approximation: MOM missing and the meeting ended more
 * than 24h ago. Used for the week-grid badge and the mark-done guard.
 */
export function isMomLate(m: Meeting, now = Date.now()): boolean {
  return !m.momSubmittedAt && now > new Date(m.endAt).getTime() + 24 * 3_600_000
}

/** MOM overdue on a still-open meeting (PLANNED / BLOCKED / RELEASED) */
export function isMomOverdue(m: Meeting, now = Date.now()): boolean {
  return (m.status === 'PLANNED' || m.status === 'BLOCKED' || m.status === 'RELEASED') && isMomLate(m, now)
}

/**
 * Working hours elapsed since `fromIso`, skipping Sat/Sun — walked in 30-min
 * steps. Drives the 24-working-hour MOM auto-block sweep.
 */
export function workingHoursSince(fromIso: string, now = Date.now()): number {
  const from = new Date(fromIso).getTime()
  if (!Number.isFinite(from) || from >= now) return 0
  // Anything older than a month is far past the 24h deadline — skip the walk
  if (now - from > 30 * 86_400_000) return 24 * 30
  let hours = 0
  for (let t = from; t < now; t += 30 * 60_000) {
    const day = new Date(t).getDay()
    if (day !== 0 && day !== 6) hours += 0.5
  }
  return hours
}
