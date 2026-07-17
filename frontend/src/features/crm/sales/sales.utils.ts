import type {
  CadenceBand,
  Journey,
  RepTarget,
  SalesMeeting,
  SalesMeetingStatus,
  SalesMeetingType,
  SalesRep,
  TargetStatus,
} from '@/types/salesdash.types'

const DAY_MS = 24 * 60 * 60 * 1000

export const MEETING_TYPE_COLORS: Record<SalesMeetingType, string> = {
  NEW: '#3b6dff',
  FOLLOWUP: '#14b8a6',
  PAYMENT: '#f59e0b',
  SPOT: '#a855f7',
}

export const MEETING_STATUS_COLORS: Record<SalesMeetingStatus, string> = {
  PLANNED: '#3b6dff',
  DONE: '#10b981',
  CANCELLED: '#94a3b8',
  BLOCKED: '#f43f5e',
  RELEASED: '#a855f7',
}

export const TARGET_STATUS_META: Record<TargetStatus, { label: string; color: string }> = {
  ON_TRACK: { label: 'On track', color: '#3b6dff' },
  AT_RISK: { label: 'At risk', color: '#f59e0b' },
  BREACHED: { label: 'Breached', color: '#f43f5e' },
  EXCEEDED: { label: 'Exceeded', color: '#10b981' },
}

export const CADENCE_COLORS: Record<CadenceBand, string> = {
  FAST: '#10b981',
  WEEKLY: '#3b6dff',
  BIWEEKLY: '#f59e0b',
  SLOW: '#f43f5e',
  NONE: '#94a3b8',
}

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: '#3b6dff',
  APPROVED: '#10b981',
  REJECTED: '#f43f5e',
  WITHDRAWN: '#94a3b8',
}

// Tinted pill style used across the dashboard: `{hex}22` background + hex text.
export const tintStyle = (hex: string) => ({ background: `${hex}22`, color: hex })

export const splitName = (name: string) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return { firstName: firstName ?? '', lastName: rest.join(' ') }
}

export const firstNameOf = (name: string) => splitName(name).firstName

export const progressPct = (target: RepTarget | undefined): number => {
  if (!target || target.target <= 0) return 0
  return Math.round((target.achieved / target.target) * 100)
}

export const computeTargetStatus = (target: number, achieved: number): TargetStatus => {
  const progress = target > 0 ? (achieved / target) * 100 : 0
  if (progress >= 100) return 'EXCEEDED'
  if (progress >= 75) return 'ON_TRACK'
  if (progress >= 40) return 'AT_RISK'
  return 'BREACHED'
}

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS))

export const daysSince = (iso: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS))

const cadenceBandOf = (touchpoints: number, avgGapDays: number): CadenceBand => {
  if (touchpoints <= 1) return 'NONE'
  if (avgGapDays <= 3) return 'FAST'
  if (avgGapDays <= 7) return 'WEEKLY'
  if (avgGapDays <= 14) return 'BIWEEKLY'
  return 'SLOW'
}

// Groups raw meetings into account journeys (meeting → PO threads). Meetings
// with a linkedLeadId are threaded by lead; the rest by pharma + contact.
export const computeJourneys = (meetings: SalesMeeting[], reps: SalesRep[]): Journey[] => {
  const groups = new Map<string, SalesMeeting[]>()
  for (const meeting of meetings) {
    if (!meeting.startAt) continue
    const key = meeting.linkedLeadId || `${meeting.pharmaName ?? ''}::${meeting.contactName ?? ''}`
    const list = groups.get(key) ?? []
    list.push(meeting)
    groups.set(key, list)
  }

  const journeys: Journey[] = []
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.startAt.localeCompare(b.startAt))
    const anchor = sorted.find((m) => m.type === 'NEW') ?? sorted[0]
    const last = sorted[sorted.length - 1]
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].startAt, sorted[i].startAt))
    const avgGapDays = gaps.length > 0 ? Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length) : 0
    const daysSinceLast = daysSince(last.startAt)
    const won = sorted.some((m) => m.outcome === 'CONVERTED_LEAD')
    const lost = sorted.some((m) => m.outcome === 'MARKED_LOST')
    const ownerName = last.ownerName ?? ''
    const owner = reps.find((r) => r.name === ownerName || (ownerName && r.name.startsWith(firstNameOf(ownerName))))

    journeys.push({
      key,
      account: anchor.pharmaName ?? '—',
      contact: anchor.contactName ?? '—',
      ownerName,
      ownerTone: owner?.tone ?? 'brand',
      anchorDate: anchor.startAt,
      followupCount: sorted.length - 1,
      totalTouchpoints: sorted.length,
      avgGapDays,
      lastTouch: last.startAt,
      daysSinceLast,
      cadenceBand: cadenceBandOf(sorted.length, avgGapDays),
      stuck: daysSinceLast > 14 && !won,
      won,
      lost,
      meetings: sorted,
    })
  }

  return journeys.sort((a, b) => b.lastTouch.localeCompare(a.lastTouch))
}

export const repMeetings = (rep: SalesRep, meetings: SalesMeeting[]): SalesMeeting[] =>
  meetings.filter(
    (m) => m.ownerName === rep.name || (m.ownerName ? m.ownerName.startsWith(firstNameOf(rep.name)) : false)
  )

// MOM discipline — a minutes-of-meeting counts as on time when submitted
// within 36h of the meeting end. Only DONE (or PLANNED-but-past) meetings
// are expected to have one; with nothing expected the rep scores 100.
export const momOnTimePct = (meetings: SalesMeeting[]): number => {
  const now = Date.now()
  const expected = meetings.filter(
    (m) => m.status === 'DONE' || (m.status === 'PLANNED' && new Date(m.endAt).getTime() < now)
  )
  if (expected.length === 0) return 100
  const onTime = expected.filter(
    (m) =>
      !!m.momSubmittedAt &&
      new Date(m.momSubmittedAt).getTime() - new Date(m.endAt).getTime() <= 36 * 60 * 60 * 1000
  )
  return Math.round((onTime.length / expected.length) * 100)
}

export interface RepPerformance {
  rep: SalesRep
  meetings: number
  newLeads: number
  followups: number
  momPct: number
  wins: number
  effortScore: number
  achieved: number
  target: number
  progress: number
}

// Effort Score = meetings×3 + follow-ups×5 + new leads×4 + MOM%×0.4 + wins×8
export const computeRepPerformance = (
  rep: SalesRep,
  allMeetings: SalesMeeting[],
  target: RepTarget | undefined
): RepPerformance => {
  const own = repMeetings(rep, allMeetings).filter((m) => m.status !== 'CANCELLED')
  const newLeads = own.filter((m) => m.type === 'NEW').length
  const followups = own.filter((m) => m.type === 'FOLLOWUP').length
  const wins = own.filter((m) => m.outcome === 'CONVERTED_LEAD').length
  const momPct = momOnTimePct(own)
  const effortScore = Math.round(own.length * 3 + followups * 5 + newLeads * 4 + momPct * 0.4 + wins * 8)

  return {
    rep,
    meetings: own.length,
    newLeads,
    followups,
    momPct,
    wins,
    effortScore,
    achieved: target?.achieved ?? 0,
    target: target?.target ?? 0,
    progress: progressPct(target),
  }
}
