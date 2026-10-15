// Builds YYYY-MM-DD from local date parts, NOT toISOString() (which converts to UTC first and
// would shift the date for any timezone ahead of UTC, e.g. India before 05:30 IST or on Jan 1).
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date())
}

// periodDays counts back from today inclusive — periodDays=30 means "today and the 29 days before it".
export function periodStartLocalDateString(periodDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - (periodDays - 1))
  return toLocalDateString(d)
}
