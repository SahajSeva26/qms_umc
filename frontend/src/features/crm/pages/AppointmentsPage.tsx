import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMeetings } from '@/features/crm/appointments/hooks/useMeetings'
import { OWNERS } from '@/features/crm/appointments/appointments.mock'
import { addDays, dayKey, startOfWeek } from '@/features/crm/appointments/appointments.utils'
import type { CalendarViewMode } from '@/features/crm/appointments/components/CalendarToolbar'
import CalendarToolbar from '@/features/crm/appointments/components/CalendarToolbar'
import WeekGrid from '@/features/crm/appointments/components/WeekGrid'
import MonthGrid from '@/features/crm/appointments/components/MonthGrid'
import MeetingList from '@/features/crm/appointments/components/MeetingList'
import MeetingDrawer from '@/features/crm/appointments/components/MeetingDrawer'
import NewMeetingDialog from '@/features/crm/appointments/components/NewMeetingDialog'

const APPROVER_ROLES = ['super_admin', 'admin', 'sales_lead']

// TODO deferred: Leads tab / lead-360 (CRM module already covers leads),
// weekly-plan panel, invitee accept/reject/propose flows, Gmail connect
// toggle, per-reminder editor, additional client-side contacts store,
// payment-invoice cascade in the new-meeting form.
const AppointmentsPage = () => {
  const { user } = useAuth()
  const { meetings, createMeeting, submitMom, reschedule, markDone, cancel, setOutcome, releaseBlock } = useMeetings()

  const meId = useMemo(() => {
    const match = OWNERS.find((o) => o.name.split(' ')[0].toLowerCase() === user?.firstName?.toLowerCase())
    return match?.id ?? OWNERS[0].id
  }, [user])

  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<CalendarViewMode>('week')
  const [activePeers, setActivePeers] = useState<Set<string>>(new Set())
  const [openMeetingId, setOpenMeetingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogPrefill, setDialogPrefill] = useState<{ date: string; hour: number } | undefined>(undefined)

  const canRelease = APPROVER_ROLES.includes(user?.role ?? '')
  const weekStart = startOfWeek(cursor)
  const weekEnd = addDays(weekStart, 6)

  const peerOwners = OWNERS.filter((o) => o.id !== meId)

  const visibleMeetings = useMemo(
    () => meetings.filter((m) => m.ownerId === meId || activePeers.has(m.ownerId)),
    [meetings, meId, activePeers]
  )

  const weekMeetings = useMemo(() => {
    const startKey = dayKey(weekStart)
    const endKey = dayKey(weekEnd)
    return visibleMeetings.filter((m) => {
      const k = dayKey(new Date(m.startAt))
      return k >= startKey && k <= endKey
    })
  }, [visibleMeetings, weekStart, weekEnd])

  const openMeeting = meetings.find((m) => m.id === openMeetingId) ?? null

  const togglePeer = (id: string) => {
    setActivePeers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSlotClick = (day: Date, hour: number) => {
    setDialogPrefill({ date: dayKey(day), hour })
    setDialogOpen(true)
  }

  const handleNewMeeting = () => {
    setDialogPrefill(undefined)
    setDialogOpen(true)
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Appointments</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Sales · Appointments
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success-soft text-success">
            Calendar · live
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            24-hr MOM auto-block
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Peer overlay (agenda hidden)
          </span>
        </div>
      </div>

      <CalendarToolbar
        weekStart={weekStart}
        view={view}
        onViewChange={setView}
        onPrev={() => setCursor((c) => addDays(c, -7))}
        onNext={() => setCursor((c) => addDays(c, 7))}
        onToday={() => setCursor(new Date())}
        peerOwners={peerOwners}
        activePeers={activePeers}
        onTogglePeer={togglePeer}
        onNewMeeting={handleNewMeeting}
      />

      {view === 'week' && (
        <WeekGrid weekStart={weekStart} meetings={weekMeetings} meId={meId} onOpen={setOpenMeetingId} onSlotClick={handleSlotClick} />
      )}
      {view === 'month' && (
        <MonthGrid
          cursor={cursor}
          meetings={visibleMeetings}
          meId={meId}
          onPickDate={(date) => {
            setCursor(date)
            setView('week')
          }}
        />
      )}
      {view === 'list' && <MeetingList meetings={weekMeetings} meId={meId} onOpen={setOpenMeetingId} />}

      <MeetingDrawer
        meeting={openMeeting}
        canRelease={canRelease}
        onClose={() => setOpenMeetingId(null)}
        onSubmitMom={submitMom}
        onReschedule={reschedule}
        onMarkDone={markDone}
        onCancel={(id) => {
          cancel(id)
          setOpenMeetingId(null)
        }}
        onSetOutcome={setOutcome}
        onReleaseBlock={(id, reason) => releaseBlock(id, reason, user?.firstName ?? 'Unknown')}
      />

      <NewMeetingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={(meeting) => {
          createMeeting(meeting)
          setDialogOpen(false)
          setOpenMeetingId(meeting.id)
        }}
        meId={meId}
        prefill={dialogPrefill}
      />
    </div>
  )
}

export default AppointmentsPage
