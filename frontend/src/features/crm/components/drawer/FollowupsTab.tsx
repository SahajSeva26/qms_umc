import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import { useAppointmentsReal } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import { appointmentStatusColor, latestAppointmentNextSteps } from '@/features/crm/appointments/appointmentsReal.utils'
import { formatDate } from '@/utils/formatters'
import { formatTimeRange } from '@/features/crm/appointments/appointments.utils'

const TYPE_COLOR: Record<string, string> = {
  new: '#3b6dff',
  'follow-up': '#14b8a6',
  payment: '#f59e0b',
  spot: '#a855f7',
}

interface FollowupsTabProps {
  lead: LeadEntity
}

const FollowupsTab = ({ lead }: FollowupsTabProps) => {
  const history = [...lead.stageHistory].reverse()

  const { data, isLoading, error } = useAppointmentsReal({ lead: lead.id, limit: '200' })
  const linkedAppointments = [...(data?.data?.items ?? [])]
    .sort((a, b) => b.duration.startTime.localeCompare(a.duration.startTime))
  const completedCount = linkedAppointments.filter((a) => a.status === 'done').length
  const openCount = linkedAppointments.filter((a) => a.status === 'planned').length

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
          <span>{lead.followUpDate ? formatDate(lead.followUpDate) : 'Not scheduled'}</span>
        </div>
      </div>

      {isLoading && (
        <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading follow-up appointments…</p>
      )}

      {error && !isLoading && (
        <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load follow-up appointments. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex items-center gap-3 text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
            <span>{linkedAppointments.length} follow-up{linkedAppointments.length === 1 ? '' : 's'}</span>
            <span>{completedCount} completed</span>
            <span>{openCount} open</span>
          </div>

          {linkedAppointments.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No follow-up appointments linked to this lead yet. Book a Follow-up appointment and link this lead.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedAppointments.map((a) => {
                const typeColor = TYPE_COLOR[a.type] ?? '#3b6dff'
                const statusColor = appointmentStatusColor(a.status)
                return (
                  <div key={a.id} className="rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                        <span style={{ color: typeColor }}>{APPOINTMENT_TYPE_LABEL[a.type]}</span> · {formatDate(a.duration.startTime)}
                        {a.duration.endTime ? `, ${formatTimeRange(a.duration.startTime, a.duration.endTime)}` : ''}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${statusColor}22`, color: statusColor }}
                      >
                        {APPOINTMENT_STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    {a.mom.details && (
                      <p className="text-[12px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>{a.mom.details}</p>
                    )}
                    {latestAppointmentNextSteps(a) && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                        Next: {latestAppointmentNextSteps(a)}
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
                {LEAD_STATUS_LABEL[entry.from]} → {LEAD_STATUS_LABEL[entry.to]}
              </div>
              <div style={{ color: 'var(--qms-text-muted)' }}>{entry.reason}</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                {new Date(entry.createdAt).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowupsTab
