import { useMemo, useState } from 'react'
import { addDays, dayKey, startOfWeek } from '@/features/crm/appointments/appointments.utils'
import { useAppointmentsReal } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import { useAppointmentReal } from '@/features/crm/appointments/hooks/useAppointmentReal'
import type { CalendarViewMode } from '@/features/crm/appointments/components/AppointmentCalendarToolbar'
import AppointmentCalendarToolbar from '@/features/crm/appointments/components/AppointmentCalendarToolbar'
import AppointmentWeekGrid from '@/features/crm/appointments/components/AppointmentWeekGrid'
import AppointmentMonthGrid from '@/features/crm/appointments/components/AppointmentMonthGrid'
import AppointmentList from '@/features/crm/appointments/components/AppointmentList'
import AppointmentDrawer from '@/features/crm/appointments/components/AppointmentDrawer'
import NewAppointmentDialog from '@/features/crm/appointments/components/NewAppointmentDialog'

// Real backend-integrated Appointments calendar. Replaces the localStorage-
// mock build (appointments.mock.ts/useMeetings.ts, kept in place but no
// longer routed to). Per the 2026-07-27 decisions documented in
// PROGRESS.md's Known Issues:
// - No "peer overlay" toggle — the backend's own applyOwnScope already
//   limits search() to appointments the caller owns or is invited to, so
//   every appointment fetched here is one the viewer can legitimately see.
// - No Outcome picker, no reschedule-history trail, no Leads-view/Weekly-
//   planning-panel — all dropped, no backend field/entity to back them.
// - "24-hr MOM auto-block" badge removed from the header chips — confirmed
//   via source read that no such automatic transition exists anywhere in
//   the real backend (see PROGRESS.md); mom.submissionDeadline is computed
//   but nothing ever acts on it. Only a real, honest badge is kept.
const AppointmentsPage = () => {
  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<CalendarViewMode>('week')
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogPrefill, setDialogPrefill] = useState<{ date: string; hour: number } | undefined>(undefined)

  const weekStart = startOfWeek(cursor)
  const weekEnd = addDays(weekStart, 6)

  // Month view needs the whole visible 6-week grid, not just the cursor's
  // own week — matches AppointmentMonthGrid's own 42-cell range.
  const rangeStart = view === 'month' ? startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1)) : weekStart
  const rangeEnd = view === 'month' ? addDays(rangeStart, 41) : weekEnd

  const { data, isLoading, error } = useAppointmentsReal({
    dateFrom: dayKey(rangeStart),
    dateTo: dayKey(rangeEnd),
    limit: '200',
  })
  const appointments = useMemo(() => data?.data?.items ?? [], [data])

  const weekAppointments = useMemo(() => {
    const startKey = dayKey(weekStart)
    const endKey = dayKey(weekEnd)
    return appointments.filter((a) => {
      const k = dayKey(new Date(a.duration.startTime))
      return k >= startKey && k <= endKey
    })
  }, [appointments, weekStart, weekEnd])

  const { data: openAppointmentData } = useAppointmentReal(openAppointmentId ?? undefined)
  const openAppointment = openAppointmentData?.data ?? null

  const handleSlotClick = (day: Date, hour: number) => {
    setDialogPrefill({ date: dayKey(day), hour })
    setDialogOpen(true)
  }

  const handleNewAppointment = () => {
    setDialogPrefill(undefined)
    setDialogOpen(true)
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Appointments</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Sales · Appointments
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success-soft text-success">
            Calendar · live
          </span>
        </div>
      </div>

      <AppointmentCalendarToolbar
        weekStart={weekStart}
        view={view}
        onViewChange={setView}
        onPrev={() => setCursor((c) => addDays(c, -7))}
        onNext={() => setCursor((c) => addDays(c, 7))}
        onToday={() => setCursor(new Date())}
        onNewAppointment={handleNewAppointment}
      />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading appointments…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load appointments. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {view === 'week' && (
            <AppointmentWeekGrid weekStart={weekStart} appointments={weekAppointments} onOpen={setOpenAppointmentId} onSlotClick={handleSlotClick} />
          )}
          {view === 'month' && (
            <AppointmentMonthGrid
              cursor={cursor}
              appointments={appointments}
              onPickDate={(date) => {
                setCursor(date)
                setView('week')
              }}
            />
          )}
          {view === 'list' && <AppointmentList appointments={weekAppointments} onOpen={setOpenAppointmentId} />}
        </>
      )}

      <AppointmentDrawer appointment={openAppointment} onClose={() => setOpenAppointmentId(null)} />

      <NewAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(id) => {
          setDialogOpen(false)
          setOpenAppointmentId(id)
        }}
        prefill={dialogPrefill}
      />
    </div>
  )
}

export default AppointmentsPage
