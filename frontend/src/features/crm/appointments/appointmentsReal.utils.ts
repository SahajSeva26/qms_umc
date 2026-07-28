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
  blocked: '#f43f5e',
  released: '#a855f7',
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

// IMPORTANT: unlike the prototype (which runs a client-side sweep on every
// calendar load that force-flips status to BLOCKED once mom.submissionDeadline
// passes), the real backend computes and stores mom.submissionDeadline
// (24 working hours after duration.endTime, Sat/Sun skipped) but has NO
// mechanism anywhere — no cron, no sweep, no lazy-check-on-read — that ever
// transitions status to 'blocked' automatically. Confirmed by reading the
// entire appointment module: 'blocked' only ever appears as an explicit
// moveStage() target. This means an appointment can be genuinely overdue
// (past its deadline, no MOM) while still showing status 'planned' — this
// helper flags that overdue state for display purposes; it does NOT mean
// the appointment IS blocked, since nothing here can make that true without
// someone (or a future backend job) explicitly calling moveStage('blocked').
// Flagged as a real backend gap (no auto-block job exists) — not something
// this frontend can or should fake.
export function isMomOverdue(a: AppointmentEntity, now = Date.now()): boolean {
  if (a.mom.details || !a.mom.submissionDeadline) return false
  return (a.status === 'planned' || a.status === 'blocked' || a.status === 'released') && now > new Date(a.mom.submissionDeadline).getTime()
}
