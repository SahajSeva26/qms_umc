import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_COLOR } from '@/types/crm.types'
import type { AppointmentEntity } from '@/types/appointment.types'
import { buildActivityHeatmap } from '@/features/crm/salesDashboard/salesDashboard.activity'
import { formatDate } from '@/utils/formatters'

interface ActivityTabProps {
  leads: LeadEntity[]
  appointments: AppointmentEntity[]
  onOpenLead: (id: string) => void
  // Only the Sales Head's view spans every rep — a KAM's own data IS the heatmap's only row.
  showHeatmap: boolean
  // Both the feed and the heatmap depend on leads AND (when showHeatmap) appointments — either
  // failing must show a retry, never a silently-empty "No activity yet"/"No activity this week"
  // (which reads as a real, good-news empty state rather than an unknown one).
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

interface ActivityEvent {
  leadId: string
  leadTitle: string
  from: LeadStatus
  to: LeadStatus
  at: string
}

// One dot color per destination stage, reusing the same LEAD_STATUS_COLOR already shown on every
// StagePill/funnel in this app — real variety instead of one flat blue for every event.
function dotColor(to: LeadStatus): string {
  return LEAD_STATUS_COLOR[to]
}

// Real stage-transition feed derived from LeadEntity.stageHistory.
function buildFeed(leads: LeadEntity[]): ActivityEvent[] {
  const events: ActivityEvent[] = []
  for (const lead of leads) {
    for (const entry of lead.stageHistory) {
      events.push({ leadId: lead.id, leadTitle: lead.title, from: entry.from, to: entry.to, at: entry.createdAt })
    }
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function repInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

// Matches the prototype's .card/.card-head/.feed/.feed-item (styles.css:505-590) and its heatmap
// .tbl table (sales.js:858-882) — but every number here is real (lead stage moves + appointments
// actually scheduled, grouped by rep + weekday), not the prototype's own admitted mock/pseudo-random
// fill (seeded by rep.id.length).
const ActivityTab = ({ leads, appointments, onOpenLead, showHeatmap, isLoading, isError, onRetry }: ActivityTabProps) => {
  const feed = buildFeed(leads)
  const heatmap = buildActivityHeatmap(appointments, leads, new Date())

  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: showHeatmap ? '1fr 1.7fr' : '1fr' }}>
        <div className="rounded-[20px] border h-64 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
        {showHeatmap && (
          <div className="rounded-[20px] border h-64 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
        )}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 text-[13px] rounded-[20px] border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
        <span>Couldn't load activity.</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border px-3 py-1.5 font-medium"
          style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: showHeatmap ? '1fr 1.7fr' : '1fr' }}>
      <div className="rounded-[20px] border p-4.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
        <div className="flex items-center justify-between gap-2.5 mb-3">
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>Recent activity</h3>
            <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Lead stage moves</div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,.18)' }} /> live
          </span>
        </div>
        <div className="flex flex-col gap-3.5">
          {feed.length === 0 && <div className="text-[12px] p-3.5" style={{ color: 'var(--qms-text-muted)' }}>No activity yet</div>}
          {feed.map((event, i) => (
            <button
              key={`${event.leadId}-${i}`}
              onClick={() => onOpenLead(event.leadId)}
              className="flex gap-3 text-left"
            >
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: dotColor(event.to), boxShadow: '0 0 0 4px var(--qms-surface-strong)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{event.leadTitle}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                  Moved {event.from} → {event.to} · {formatDate(event.at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showHeatmap && (
        <div className="rounded-[20px] border p-4.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
          <div className="mb-3">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>Activity heatmap (week)</h3>
            <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Stage moves + meetings per rep</div>
          </div>
          {heatmap.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No activity this week.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] pb-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)', width: '25%' }}>Rep</th>
                    {DAY_LABELS.map((d) => (
                      <th key={d} className="text-center text-[11px] font-bold uppercase tracking-[0.06em] pb-2.5 px-3" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>{d}</th>
                    ))}
                    <th className="text-right text-[11px] font-bold uppercase tracking-[0.06em] pb-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row) => {
                    const max = Math.max(1, ...row.counts)
                    return (
                      <tr key={row.repId} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: 'linear-gradient(135deg, #3b6dff, #7c5cff)' }}
                            >
                              {repInitials(row.repName)}
                            </span>
                            <span style={{ color: 'var(--qms-text)' }}>{row.repName.split(' ')[0]}</span>
                          </div>
                        </td>
                        {row.counts.map((v, i) => {
                          const alpha = v === 0 ? 0.08 : 0.10 + (v / max) * 0.85
                          return (
                            <td key={i} className="text-center font-bold rounded py-2.5 px-3" style={{ background: `rgba(36,81,240,${alpha.toFixed(2)})`, color: alpha >= 0.6 ? 'white' : 'var(--qms-text)' }}>
                              {v}
                            </td>
                          )
                        })}
                        <td className="text-right font-bold pl-2" style={{ color: 'var(--qms-text)' }}>{row.total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityTab
