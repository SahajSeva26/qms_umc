import type { Lead } from '@/types/lead.types'
import { STAGES, LOST_STAGE } from '@/features/crm/crm.mock'
import { useMeetings } from '@/features/crm/appointments/hooks/useMeetings'
import { MEETING_STATUS_META, MEETING_TYPE_META } from '@/types/meeting.types'
import { formatDate } from '@/utils/formatters'
import { formatTimeRange } from '@/features/crm/appointments/appointments.utils'

interface FollowupsTabProps {
  lead: Lead
}

function stageName(id: string): string {
  return id === 'lost' ? LOST_STAGE.name : STAGES.find((s) => s.id === id)?.name ?? id
}

const FollowupsTab = ({ lead }: FollowupsTabProps) => {
  const history = [...(lead.stageHistory ?? [])].reverse()

  // Meetings live in the Appointments module — read through its own hook
  // (not its internals) and cross-reference by linkedLeadId, mirroring the
  // prototype's renderFollowups() (crm.js) which does the same join.
  const { meetings: allMeetings, isLoading, error } = useMeetings()
  const linkedMeetings = [...allMeetings]
    .filter((m) => m.linkedLeadId === lead.id)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  const completedCount = linkedMeetings.filter((m) => m.status === 'DONE').length
  const openCount = linkedMeetings.filter((m) => m.status === 'PLANNED' || m.status === 'BLOCKED' || m.status === 'RELEASED').length

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Next follow-up
        </div>
        <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <span>{lead.nextAction}</span>
          <span className="font-bold">{lead.nextDue}</span>
        </div>
      </div>

      {isLoading && (
        <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading follow-up meetings…</p>
      )}

      {error && !isLoading && (
        <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load follow-up meetings. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex items-center gap-3 text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
            <span>{linkedMeetings.length} follow-up{linkedMeetings.length === 1 ? '' : 's'}</span>
            <span>{completedCount} completed</span>
            <span>{openCount} open</span>
          </div>

          {linkedMeetings.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No follow-up meetings linked to this lead yet. Book a Follow-up meeting and link this lead no.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedMeetings.map((m) => {
                const typeMeta = MEETING_TYPE_META[m.type]
                const statusMeta = MEETING_STATUS_META[m.status]
                return (
                  <div key={m.id} className="rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                        {typeMeta.name} · {formatDate(m.startAt)}, {formatTimeRange(m.startAt, m.endAt)}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${statusMeta.color}22`, color: statusMeta.color }}
                      >
                        {statusMeta.name}
                      </span>
                    </div>
                    {m.momText && (
                      <p className="text-[12px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>{m.momText}</p>
                    )}
                    {m.nextSteps && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                        Next: {m.nextSteps}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
        Stage history
      </h3>
      {history.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No stage changes recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry, i) => (
            <div key={i} className="text-[12px] rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
              <div className="font-semibold mb-0.5" style={{ color: 'var(--qms-text)' }}>
                {stageName(entry.from)} → {stageName(entry.to)}
              </div>
              <div style={{ color: 'var(--qms-text-muted)' }}>{entry.reason}</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                {new Date(entry.at).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowupsTab
