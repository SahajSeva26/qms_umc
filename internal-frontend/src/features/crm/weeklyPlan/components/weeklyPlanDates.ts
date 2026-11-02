// Pure date helpers for WeeklyPlanFormDialog's submit flow — unit-testable without the Calendar popover.

// A literal UTC-noon instant for a date-only string. Must be `Z`, not local time — a bare
// local-time string re-parses using the machine's own offset, defeating the point.
export const toNoonIso = (dateOnly: string): string => `${dateOnly}T12:00:00.000Z`

export const toSubmitIso = (dateOnly: string): string => new Date(toNoonIso(dateOnly)).toISOString()

/** True when a visit's date (ISO or YYYY-MM-DD) falls outside the plan's own week bounds. */
export const isOutsideWeek = (visitDate: string, weekStart: string, weekEnd: string): boolean => {
  const day = visitDate.slice(0, 10)
  return day < weekStart || day > weekEnd
}
