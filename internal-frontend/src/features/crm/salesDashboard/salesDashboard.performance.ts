import type { LeadEntity } from '@/types/crm.types'
import type { AppointmentEntity } from '@/types/appointment.types'

export interface RepPerformanceRow {
  repId: string
  repName: string
  meetings: number
  followUps: number
  newLeads: number
  won: number
  lost: number
  winRate: number
  wonValue: number
}

// The seeded platform bootstrap Role (seedSystemUser.ts: RoleModel.create({ code: 'system', ... }))
// can own real stage moves (e.g. an admin script), but it isn't a sales rep and doesn't belong on a
// rep leaderboard. Identified by `code`, not `type` — `type` on the raw populated Role document is a
// RoleType ObjectId, not a code string.
const SYSTEM_ROLE_CODE = 'system'

function repIdentity(role: { _id?: string; code: string; name: string } | string): { id: string; name: string } | null {
  if (typeof role === 'string' || role.code === SYSTEM_ROLE_CODE) return null
  return { id: role._id ?? role.code, name: role.name }
}

function emptyRow(id: string, name: string): RepPerformanceRow {
  return { repId: id, repName: name, meetings: 0, followUps: 0, newLeads: 0, won: 0, lost: 0, winRate: 0, wonValue: 0 }
}

// Real per-rep leaderboard, from a tenant-wide lead sweep + appointment sweep. Deliberately omits
// the prototype's own fake/unusable columns: Effort Score (hardcoded hand-picked weighting, no
// backend-config basis), MoM On-time % (Appointment.mom.submittedAt is modeled but never actually
// set by any real backend code path — would always read 0%), and Achieved/Target (no Targets module
// exists — see crm.myKpis.ts for the same finding elsewhere in this dashboard).
export function buildLeaderboard(leads: LeadEntity[], appointments: AppointmentEntity[]): RepPerformanceRow[] {
  const byRep = new Map<string, RepPerformanceRow>()
  const getRow = (id: string, name: string) => byRep.get(id) ?? emptyRow(id, name)

  for (const lead of leads) {
    const identity = repIdentity(lead.salesPerson)
    if (!identity) continue
    const row = getRow(identity.id, identity.name)
    row.newLeads++
    if (lead.status === 'won') { row.won++; row.wonValue += lead.estimatedValue }
    if (lead.status === 'lost') row.lost++
    byRep.set(identity.id, row)
  }

  for (const appt of appointments) {
    const identity = repIdentity(appt.salesPerson)
    if (!identity) continue
    const row = getRow(identity.id, identity.name)
    row.meetings++
    if (appt.type === 'follow-up') row.followUps++
    byRep.set(identity.id, row)
  }

  return Array.from(byRep.values())
    .map((row) => ({ ...row, winRate: row.won + row.lost > 0 ? Math.round((row.won / (row.won + row.lost)) * 1000) / 10 : 0 }))
    .sort((a, b) => b.wonValue - a.wonValue)
}
