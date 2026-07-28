import type { AppointmentEntity } from '@/types/appointment.types'
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import { formatDate } from '@/utils/formatters'
import { appointmentRefName, appointmentStatusColor, isMomOverdue } from '@/features/crm/appointments/appointmentsReal.utils'

interface AppointmentListProps {
  appointments: AppointmentEntity[]
  onOpen: (id: string) => void
}

// Adapted from the prototype's MeetingList.tsx — same flat-row layout, no
// peer-BUSY row (see AppointmentWeekGrid.tsx's comment).
const AppointmentList = ({ appointments, onOpen }: AppointmentListProps) => {
  if (appointments.length === 0) {
    return (
      <div
        className="rounded-2xl border p-8 text-center text-[13px]"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
      >
        No appointments this week
      </div>
    )
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
      {appointments.map((a, i) => {
        const statusColor = appointmentStatusColor(a.status)
        const overdue = a.status === 'planned' && isMomOverdue(a)
        const start = new Date(a.duration.startTime)
        const end = a.duration.endTime ? new Date(a.duration.endTime) : null
        return (
          <div
            key={a.id}
            onClick={() => onOpen(a.id)}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-(--qms-surface-hover)"
            style={i > 0 ? { borderTop: '1px solid var(--qms-border)' } : undefined}
          >
            <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: statusColor }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                {appointmentRefName(a.contactPerson) ?? 'Contact'} · {appointmentRefName(a.tenant) ?? 'Company'}
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {[
                  APPOINTMENT_TYPE_LABEL[a.type],
                  formatDate(a.duration.startTime),
                  end ? `${start.toTimeString().slice(0, 5)}–${end.toTimeString().slice(0, 5)}` : start.toTimeString().slice(0, 5),
                ].join(' · ')}
                {overdue && <span className="font-semibold text-danger"> · ⚠ MOM overdue</span>}
              </div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              {APPOINTMENT_STATUS_LABEL[a.status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default AppointmentList
