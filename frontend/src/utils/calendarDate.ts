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

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Local-timezone YYYY-MM-DD key, for bucketing items into day cells/columns */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
