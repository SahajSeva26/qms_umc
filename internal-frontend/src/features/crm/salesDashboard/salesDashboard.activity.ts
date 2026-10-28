import type { AppointmentEntity } from '@/types/appointment.types'
import type { LeadEntity } from '@/types/crm.types'

export interface HeatmapRow {
  repId: string
  repName: string
  // Mon..Sat, matching the prototype's 6-day week (no Sunday column).
  counts: number[]
  total: number
}

const DAY_COUNT = 6 // Mon..Sat

// The seeded platform bootstrap Role (seedSystemUser.ts: RoleModel.create({ code: 'system', ... })) —
// real stage moves/appointments can be attributed to it (e.g. an admin script), but it isn't a sales
// rep and doesn't belong on a rep leaderboard/heatmap. `role.type` is the raw, unmapped Role
// document's `type` field — a RoleType ObjectId, NOT a role-type code string — so the system role
// must be identified by its own `code` ('system'), not by `type`.
const SYSTEM_ROLE_CODE = 'system'

function isRealSalesRep<T extends { code?: string }>(role: T | string): role is T {
  return typeof role !== 'string' && role.code !== SYSTEM_ROLE_CODE
}

// Start of the current week (Monday 00:00 local), so "this week" genuinely means this week — not
// every Monday/Tuesday/etc. ever recorded collapsed into one column (a real bug the first version of
// this function had: new Date(x).getDay() buckets by weekday-of-week across ALL history with no
// date-range filter at all).
function startOfCurrentWeek(now: Date): Date {
  const day = now.getDay() // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Real heatmap, scoped to the actual current week — unlike the prototype's version (explicitly
// mock, seeded by rep.id.length), every cell here is a genuine count: appointments actually
// scheduled + lead stage moves actually made THIS WEEK, grouped by the rep who owns them and the
// weekday (Mon=0..Sat=5) they happened on. No Sunday column, matching the prototype's own 6-day
// layout. `now` is passed in (not read internally) so this stays pure/testable.
export function buildActivityHeatmap(appointments: AppointmentEntity[], leads: LeadEntity[], now: Date): HeatmapRow[] {
  const byRep = new Map<string, { repName: string; counts: number[] }>()
  const weekStart = startOfCurrentWeek(now)
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000)

  const bump = (repId: string | undefined, repName: string | undefined, dateStr: string) => {
    if (!repId || !repName) return
    const date = new Date(dateStr)
    if (date < weekStart || date >= weekEnd) return // outside the current week
    const day = date.getDay() // 0=Sun..6=Sat
    if (day === 0) return // no Sunday column
    const col = day - 1 // Mon=0..Sat=5
    const row = byRep.get(repId) ?? { repName, counts: new Array(DAY_COUNT).fill(0) }
    row.counts[col]++
    byRep.set(repId, row)
  }

  for (const appt of appointments) {
    if (!isRealSalesRep(appt.salesPerson)) continue
    bump(appt.salesPerson._id ?? appt.salesPerson.code, appt.salesPerson.name, appt.duration.startTime)
  }

  for (const lead of leads) {
    if (!isRealSalesRep(lead.salesPerson)) continue
    for (const entry of lead.stageHistory) {
      bump(lead.salesPerson._id ?? lead.salesPerson.code, lead.salesPerson.name, entry.createdAt)
    }
  }

  return Array.from(byRep.entries())
    .map(([repId, { repName, counts }]) => ({ repId, repName, counts, total: counts.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
}
