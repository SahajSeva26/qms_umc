import { FiX } from 'react-icons/fi'
import { useAppointmentsReal } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { APPOINTMENT_TYPE_LABEL } from '@/features/crm/appointments/appointment.types'
import type { AppointmentEntity } from '@/features/crm/appointments/appointment.types'

interface LinkedMeetingPickerProps {
  value: string
  label: string
  divisionId: string
  onChange: (appointmentId: string, appointmentLabel: string) => void
}

// Picks a prior appointment as this follow-up's `parent`. Scoped list by division,
// not a typeahead — appointment search has no free-text option.
const LinkedMeetingPicker = ({ value, label, divisionId, onChange }: LinkedMeetingPickerProps) => {
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching } = useAppointmentsReal(
    { division: divisionId, limit: '20' },
    { enabled: open && !!divisionId },
  )
  const results = data?.data?.items ?? []

  const meetingLabel = (a: AppointmentEntity) =>
    `${a.code} · ${APPOINTMENT_TYPE_LABEL[a.type]} · ${new Date(a.duration.startTime).toLocaleDateString()}`

  const pickMeeting = (a: AppointmentEntity) => {
    onChange(a.id, meetingLabel(a))
    setOpen(false)
  }

  const clearSelection = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange('', '')
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div
          onClick={() => { if (divisionId) { clearSelection(); setOpen(true) } }}
          className="flex items-center gap-2 h-8 rounded-lg border px-2.5 text-[13px]"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)', cursor: divisionId ? 'pointer' : 'default' }}
        >
          <span className="flex-1 truncate">{label || value}</span>
          <button type="button" onClick={clearSelection} aria-label="Clear linked meeting">
            <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!divisionId}
          className="flex items-center h-8 w-full rounded-lg border px-2.5 text-[13px] text-left disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
        >
          {divisionId ? 'Select a prior meeting...' : 'Select a division first'}
        </button>
      )}

      {open && !value && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-56 overflow-y-auto">
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
          )}
          {!isFetching && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No prior meetings found for this division.</div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => pickMeeting(a)}
              className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              <span className="truncate">{meetingLabel(a)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide shrink-0" style={{ color: 'var(--qms-text-muted)' }}>
                {a.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LinkedMeetingPicker
