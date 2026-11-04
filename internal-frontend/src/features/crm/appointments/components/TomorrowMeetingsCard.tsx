import { FiSun } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useAppointmentsReal } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import { APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import type { AppointmentEntity } from '@/types/appointment.types'
import { APPOINTMENT_TYPE_COLOR } from '@/features/crm/appointments/appointmentsReal.utils'
import { addDays, dayKey } from '@/utils/calendarDate'

function fmtDayShort(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}
const populatedName = (value: { name?: string } | string) => (typeof value === 'string' ? value : value.name)

const TOMORROW_MEETINGS_LIMIT = '50'

// "Tomorrow" card — mirrors the prototype's sales-weekly-plan.js nextDayList(). Scope follows
// the backend's own-scope rule: appointment:manage OR tenant:manage sees everyone, else own only.
const TomorrowMeetingsCard = () => {
  const { hasAnyPermission } = usePermission()
  const canViewAll = hasAnyPermission(['appointment:manage', 'tenant:manage'])
  const tomorrow = addDays(new Date(), 1)

  const { data, isLoading, isError, refetch } = useAppointmentsReal({
    dateFrom: dayKey(tomorrow),
    dateTo: dayKey(tomorrow),
    limit: TOMORROW_MEETINGS_LIMIT,
  })
  const totalCount = data?.data?.count ?? 0
  const items = data?.data?.items ?? []
  const meetings = items
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.duration.startTime).getTime() - new Date(b.duration.startTime).getTime())
  // Only a FULL page implies more pages exist — a short page is genuinely everything, even
  // after cancelled rows are filtered out below.
  const truncated = items.length === Number(TOMORROW_MEETINGS_LIMIT) && totalCount > items.length

  const scopeLabel = canViewAll ? 'all' : 'your'

  return (
    <div className="rounded-[14px] border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <h3 className="flex items-center gap-2 text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
        <FiSun size={15} /> Tomorrow · {fmtDayShort(tomorrow)}
      </h3>
      <div className="text-[11px] mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
        {isLoading || isError
          ? '…'
          : truncated
            ? `Showing first ${meetings.length} of ${totalCount} meetings in ${scopeLabel} calendar`
            : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'} in ${scopeLabel} calendar`}
      </div>

      {isLoading && <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>}

      {isError && !isLoading && (
        <div className="text-[12px] py-2 text-danger">
          Couldn't load tomorrow's meetings.{' '}
          <button type="button" className="underline decoration-dotted" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && meetings.length === 0 && (
        <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>No meetings scheduled for tomorrow.</div>
      )}

      {!isLoading && !isError && meetings.length > 0 && (
        <div>
          {meetings.map((m: AppointmentEntity) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 py-2 border-t first:border-t-0 border-dashed"
              style={{ borderColor: 'var(--qms-border)' }}
            >
              <div className="text-[11px] font-extrabold min-w-[58px]" style={{ color: 'var(--qms-brand)' }}>
                {fmtTime(m.duration.startTime)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold truncate">
                  {populatedName(m.contactPerson)} · {populatedName(m.tenant)}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {typeof m.contactPerson !== 'string' && m.contactPerson.designation}
                  {m.location && ` · ${m.location}`}
                  {canViewAll && ` · ${populatedName(m.salesPerson)}`}
                </div>
              </div>
              <span
                className="text-[9.5px] font-extrabold uppercase tracking-[.03em] px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: `color-mix(in srgb, ${APPOINTMENT_TYPE_COLOR[m.type]} 13%, transparent)`, color: APPOINTMENT_TYPE_COLOR[m.type] }}
              >
                {APPOINTMENT_TYPE_LABEL[m.type]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TomorrowMeetingsCard
