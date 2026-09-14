import { useMemo, useState } from 'react'
import { addDays, dayKey, startOfWeek } from '@/utils/calendarDate'
import { shiftCalendarCursor } from '@/features/crm/appointments/appointments.utils'
import { useAppointmentsReal } from '@/features/crm/appointments/hooks/useAppointmentsReal'
import { useAppointmentReal } from '@/features/crm/appointments/hooks/useAppointmentReal'
import { useAppointmentReport } from '@/features/crm/appointments/hooks/useAppointmentReport'
import { usePermission } from '@/hooks/usePermission'
import type { CalendarViewMode } from '@/features/crm/appointments/components/AppointmentCalendarToolbar'
import AppointmentCalendarToolbar from '@/features/crm/appointments/components/AppointmentCalendarToolbar'
import AppointmentKpiStrip from '@/features/crm/appointments/components/AppointmentKpiStrip'
import AppointmentWeekGrid from '@/features/crm/appointments/components/AppointmentWeekGrid'
import AppointmentMonthGrid from '@/features/crm/appointments/components/AppointmentMonthGrid'
import AppointmentList from '@/features/crm/appointments/components/AppointmentList'
import AppointmentDrawer from '@/features/crm/appointments/components/AppointmentDrawer'
import NewAppointmentDialog from '@/features/crm/appointments/components/NewAppointmentDialog'

const AppointmentsPage = () => {
  const { hasPermission } = usePermission()
  // Matches the route's actual guard exactly (appointment.routes.ts) — this
  // endpoint accepts appointment:manage alone, not the usual tenant:manage pair.
  const canViewReport = hasPermission('appointment:manage')

  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<CalendarViewMode>('month')
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogPrefill, setDialogPrefill] = useState<{ date: string; hour: number } | undefined>(undefined)
  // Forces NewAppointmentDialog to remount on every open, even a repeat click on the same slot.
  const [dialogSession, setDialogSession] = useState(0)

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

  // Scoped to the same visible range as the calendar grid, unlike the
  // Leads/Projects reports (always tenant-wide) — this report's date filters
  // are real, and the page is inherently date-driven.
  const { report, isLoading: reportLoading, error: reportError } = useAppointmentReport(
    { dateFrom: dayKey(rangeStart), dateTo: dayKey(rangeEnd) },
    canViewReport,
  )
  const kpis = useMemo(
    () => ({
      total: report?.summary.total ?? 0,
      planned: report?.summary.planned ?? 0,
      done: report?.summary.done ?? 0,
      cancelled: report?.summary.cancelled ?? 0,
    }),
    [report],
  )

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
    setDialogSession((s) => s + 1)
    setDialogOpen(true)
  }

  const handleNewAppointment = () => {
    setDialogPrefill(undefined)
    setDialogSession((s) => s + 1)
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

      {!canViewReport && (
        <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
          Statistics are available to appointment managers.
        </p>
      )}

      {canViewReport && reportLoading && (
        <div className="grid gap-2.5 mb-4 grid-cols-4 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-3 h-18 animate-pulse"
              style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
            />
          ))}
        </div>
      )}

      {canViewReport && !reportLoading && reportError && (
        <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
          Couldn't load stats.
        </p>
      )}

      {canViewReport && !reportLoading && !reportError && report && <AppointmentKpiStrip kpis={kpis} />}

      <AppointmentCalendarToolbar
        weekStart={weekStart}
        cursor={cursor}
        view={view}
        onViewChange={setView}
        onPrev={() => setCursor((c) => shiftCalendarCursor(c, view, -1))}
        onNext={() => setCursor((c) => shiftCalendarCursor(c, view, 1))}
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
              // Opens New Appointment directly, prefilled with the clicked
              // day — matches week view's own one-click behavior instead of
              // making the user land on week view and click a second time.
              // Month cells have no hour granularity, so this reuses the
              // dialog's own no-prefill default start hour (10:00, see
              // NewAppointmentDialog.tsx).
              onPickDate={(date) => handleSlotClick(date, 10)}
            />
          )}
          {view === 'list' && <AppointmentList appointments={weekAppointments} onOpen={setOpenAppointmentId} />}
        </>
      )}

      <AppointmentDrawer appointment={openAppointment} onClose={() => setOpenAppointmentId(null)} />

      <NewAppointmentDialog
        key={dialogSession}
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
