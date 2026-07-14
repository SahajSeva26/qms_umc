// Timeline math for the Project Gantt screen — mirrors the prototype's
// gantt.js VIEWS config and day/pixel formulas exactly (confirmed via
// research: plain CSS-positioned divs, not SVG/canvas).

export type GanttViewId = 'quarter' | 'month' | 'week'

export interface GanttView {
  id: GanttViewId
  label: string
  days: number
  pxPerDay: number
}

// Note: "Month" is genuinely 35 days wide in the source (a stale code comment
// there says 30 — the 35-day constant is what actually renders).
export const GANTT_VIEWS: Record<GanttViewId, GanttView> = {
  quarter: { id: 'quarter', label: 'Quarter', days: 90, pxPerDay: 5 },
  month: { id: 'month', label: 'Month', days: 35, pxPerDay: 16 },
  week: { id: 'week', label: 'Week', days: 14, pxPerDay: 60 },
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function parseISO(iso: string): Date {
  return new Date(iso)
}

export function rangeStart(anchor: Date, view: GanttView): Date {
  return addDays(anchor, -Math.floor(view.days / 2))
}

export function formatRangeLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  return `${startLabel} → ${endLabel}`
}

export interface BarGeometry {
  left: number
  width: number
}

export function clampDate(date: Date, start: Date, view: GanttView): Date {
  if (date < start) return start
  const maxDate = addDays(start, view.days)
  if (date > maxDate) return maxDate
  return date
}

export function barGeometry(start: string, end: string, rangeStartDate: Date, view: GanttView): BarGeometry | null {
  const ps = parseISO(start)
  const pe = parseISO(end)
  const visStart = clampDate(ps, rangeStartDate, view)
  const visEnd = clampDate(pe, rangeStartDate, view)
  const offDays = daysBetween(rangeStartDate, visStart)
  const widthDays = daysBetween(visStart, visEnd)
  const trackWidth = view.days * view.pxPerDay

  const left = offDays * view.pxPerDay
  if (left < 0 || left > trackWidth) return null

  const width = Math.max(widthDays * view.pxPerDay, 8)
  return { left, width }
}

export function markerLeft(dateIso: string, rangeStartDate: Date, view: GanttView): number | null {
  const d = parseISO(dateIso)
  const left = daysBetween(rangeStartDate, d) * view.pxPerDay
  const trackWidth = view.days * view.pxPerDay
  if (left < 0 || left > trackWidth) return null
  return left
}

export function todayLineLeft(rangeStartDate: Date, view: GanttView): number | null {
  return markerLeft(new Date().toISOString().slice(0, 10), rangeStartDate, view)
}
