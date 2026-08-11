import type { AppointmentEntity, AppointmentStatus } from '@/types/appointment.types'

// Resolves an Appointment reference field (tenant/division/salesPerson/
// contactPerson/lead/parent/internalMembers.role) to a plain id string
// regardless of whether the value is a populated object (search()/get(),
// which both always populate — see appointment.types.ts's comments) or a
// bare ObjectId string (a create/update response's own echo before a
// follow-up GET).
export function appointmentRefId(value: { _id?: string; id?: string } | string | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  return value._id ?? value.id ?? null
}

export function appointmentRefName(value: { name?: string } | string | null | undefined): string | null {
  if (value == null || typeof value === 'string') return null
  return value.name ?? null
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  planned: '#3b6dff',
  done: '#10b981',
  cancelled: '#94a3b8',
}

const TYPE_COLOR: Record<AppointmentEntity['type'], string> = {
  new: '#3b6dff',
  'follow-up': '#14b8a6',
  payment: '#f59e0b',
  spot: '#a855f7',
}

// Calendar chip background: type color while planned, overridden by status
// color once it's left that state — mirrors the prototype's chipColor()
// exactly (sales-calendar-data.js's per-type/per-status color tables).
export function appointmentChipColor(a: AppointmentEntity): string {
  return a.status === 'planned' ? TYPE_COLOR[a.type] : STATUS_COLOR[a.status]
}

export function appointmentStatusColor(status: AppointmentStatus): string {
  return STATUS_COLOR[status]
}

/** Darker shade of a #rrggbb color, used for a chip's left border. */
export function darken(hex: string, factor = 0.72): string {
  const n = hex.replace('#', '')
  const channel = (i: number) => pad2(Math.round(parseInt(n.slice(i, i + 2), 16) * factor).toString(16))
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

const pad2 = (s: string) => (s.length < 2 ? `0${s}` : s)

// Flags a planned appointment whose MOM submission deadline (24 working
// hours after duration.endTime, Sat/Sun skipped) has passed with no MOM
// submitted — display-only, no backend status change results from this.
export function isMomOverdue(a: AppointmentEntity, now = Date.now()): boolean {
  if (a.mom.details || !a.mom.submissionDeadline) return false
  return a.status === 'planned' && now > new Date(a.mom.submissionDeadline).getTime()
}

export interface LaidOutAppointment {
  appointment: AppointmentEntity
  start: Date
  end: Date
  /** 0-based column index within its overlap cluster. */
  column: number
  /** How many columns wide this appointment's overlap cluster is. */
  columnCount: number
}

// Google-Calendar/Outlook-style overlap-aware column packing — found
// missing 2026-07-28 (a real week with many concurrent appointments simply
// stacked all of them at full width on top of each other, illegible). The
// original prototype (sales-calendar.js) never solved this either — its
// only overlap-detection helper is used solely for the New Meeting form's
// per-person free/busy clash check, not for chip layout — so this is new,
// not adapted from anywhere.
//
// Algorithm: sort by start time, greedily place each appointment in the
// lowest-numbered column whose previously-placed appointment has already
// ended (classic interval partitioning / "meeting rooms" greedy). Distinct,
// non-overlapping clusters (a gap with no active appointment at all) reset
// independently so a single early-morning appointment doesn't get squeezed
// narrow just because the afternoon is busy.
export function layoutDayAppointments(appointments: AppointmentEntity[]): LaidOutAppointment[] {
  const withTimes = appointments
    .map((a) => {
      const start = new Date(a.duration.startTime)
      const end = a.duration.endTime ? new Date(a.duration.endTime) : new Date(start.getTime() + 3_600_000)
      return { appointment: a, start, end }
    })
    .sort((x, y) => x.start.getTime() - y.start.getTime())

  // Column end times, index = column number. A column is "free" for a new
  // item once that column's last-placed end time is <= the new item's start.
  const columnEnds: number[] = []
  // Which cluster each column currently belongs to, so columnCount can be
  // computed per-cluster rather than globally once we know the final shape.
  const placements: { start: Date; end: Date; appointment: AppointmentEntity; column: number; clusterId: number }[] = []
  let clusterId = -1
  let clusterMaxEnd = -Infinity

  for (const item of withTimes) {
    const startMs = item.start.getTime()
    // A new cluster begins whenever this item starts after every
    // previously-seen item (in this cluster) has already ended.
    if (startMs >= clusterMaxEnd) {
      clusterId += 1
      columnEnds.length = 0
      clusterMaxEnd = -Infinity
    }
    let column = columnEnds.findIndex((endMs) => endMs <= startMs)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(item.end.getTime())
    } else {
      columnEnds[column] = item.end.getTime()
    }
    clusterMaxEnd = Math.max(clusterMaxEnd, item.end.getTime())
    placements.push({ ...item, column, clusterId })
  }

  const clusterWidths = new Map<number, number>()
  for (const p of placements) {
    clusterWidths.set(p.clusterId, Math.max(clusterWidths.get(p.clusterId) ?? 0, p.column + 1))
  }

  return placements.map((p) => ({
    appointment: p.appointment,
    start: p.start,
    end: p.end,
    column: p.column,
    columnCount: clusterWidths.get(p.clusterId) ?? 1,
  }))
}
