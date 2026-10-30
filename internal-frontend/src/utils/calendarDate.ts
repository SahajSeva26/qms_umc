// Generic month/week-grid date math — shared by any calendar-shaped view
// (currently the Leads and Appointments month calendars). No domain coupling.

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

/** Whole-day difference (b - a), both treated as local midnight — for bucketing a date into a fixed-size window (e.g. which 15-day block it falls in). */
export function diffInDays(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Local-timezone YYYY-MM-DD key, for bucketing items into day cells/columns */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
