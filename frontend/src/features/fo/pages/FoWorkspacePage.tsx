import { useMemo, useState } from 'react'
import {
  FiUser, FiGrid, FiCalendar, FiFileText, FiAward, FiClock, FiPackage, FiAlertTriangle,
  FiBell, FiCheckSquare, FiBarChart2, FiCpu, FiHelpCircle,
} from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useCampsData } from '@/hooks/useCampsData'
import {
  useFoClaims, useFoTraining, useFoLeaves, useFoIncidents, useFoConsumables, useFoNotifications,
} from '@/features/fo/hooks/useFo'
import type { Person } from '@/types/people.types'
import RunCampWizard from '@/features/fo/components/runcamp/RunCampWizard'

import ProfileModule from '@/features/fo/components/workspace/ProfileModule'
import DashboardModule from '@/features/fo/components/workspace/DashboardModule'
import ScheduleModule from '@/features/fo/components/workspace/ScheduleModule'
import ExpensesModule from '@/features/fo/components/workspace/ExpensesModule'
import TrainingModule from '@/features/fo/components/workspace/TrainingModule'
import LeaveModule from '@/features/fo/components/workspace/LeaveModule'
import InventoryModule from '@/features/fo/components/workspace/InventoryModule'
import IncidentsModule from '@/features/fo/components/workspace/IncidentsModule'
import NotificationsModule from '@/features/fo/components/workspace/NotificationsModule'
import AttendanceModule from '@/features/fo/components/workspace/AttendanceModule'
import ReportsModule from '@/features/fo/components/workspace/ReportsModule'
import DevicesModule from '@/features/fo/components/workspace/DevicesModule'
import HelpModule from '@/features/fo/components/workspace/HelpModule'

type TabId =
  | 'profile' | 'dashboard' | 'schedule' | 'expenses' | 'training' | 'leave'
  | 'inventory' | 'incidents' | 'notif' | 'attendance' | 'reports' | 'devices' | 'help'

const TABS: { id: TabId; label: string; icon: typeof FiUser }[] = [
  { id: 'profile', label: 'Profile', icon: FiUser },
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'schedule', label: 'Schedule', icon: FiCalendar },
  { id: 'expenses', label: 'Expenses', icon: FiFileText },
  { id: 'training', label: 'Training', icon: FiAward },
  { id: 'leave', label: 'Leave', icon: FiClock },
  { id: 'inventory', label: 'Inventory', icon: FiPackage },
  { id: 'incidents', label: 'Incidents', icon: FiAlertTriangle },
  { id: 'notif', label: 'Notifications', icon: FiBell },
  { id: 'attendance', label: 'Attendance', icon: FiCheckSquare },
  { id: 'reports', label: 'Reports', icon: FiBarChart2 },
  { id: 'devices', label: 'Devices', icon: FiCpu },
  { id: 'help', label: 'Help', icon: FiHelpCircle },
]

const FoWorkspacePage = () => {
  const { user } = useAuth()
  const { people: allPeople, devices } = usePeopleData()
  const { camps, patchCamp } = useCampsData()

  const fos = useMemo(() => allPeople.filter((p) => p.role === 'Field Officer'), [allPeople])

  // ME (Person) — same synthetic-fallback pattern as FoPage's selfPerson:
  // match the logged-in user against the FO roster by name/email/id, else
  // synthesize a minimal Person record from the auth user so the workspace
  // still renders sensibly for accounts not yet seeded into PEOPLE.
  const me: Person = useMemo(() => {
    if (!user) return fos[0] ?? ({} as Person)
    const fullName = `${user.firstName} ${user.lastName}`.trim()
    const match = fos.find((f) => f.name === fullName || f.email === user.email || f.id === user._id)
    if (match) return match
    return {
      id: user._id,
      name: fullName || 'Field Officer',
      role: 'Field Officer',
      phone: '',
      email: user.email,
      hq: '—',
      states: [],
      joined: new Date().toISOString().slice(0, 10),
      machinesAssigned: [],
    }
  }, [user, fos])

  const { claims, fileClaim } = useFoClaims()
  const { training } = useFoTraining(me.id)
  const { leaves, applyLeave } = useFoLeaves(me.id)
  const { incidents, raiseIncident } = useFoIncidents(me.id)
  const { consumables } = useFoConsumables(me.id)
  const { notifications, unreadNotifCount, markAllRead } = useFoNotifications(me.id, camps, claims, incidents, consumables, training)

  const [tab, setTab] = useState<TabId>('dashboard')

  const myClaims = useMemo(() => claims.filter((c) => c.foId === me.id), [claims, me.id])

  // DevicesModule's "Report" button hands off to IncidentsModule's own Raise
  // SOS modal (which already owns that state) by switching tabs and bumping
  // a signal + prefill device id — mirrors the openSignal/onModalHandled
  // contract IncidentsModule/DevicesModule were already built against.
  const [deviceReportSignal, setDeviceReportSignal] = useState(0)
  const [prefillDeviceId, setPrefillDeviceId] = useState<string | undefined>(undefined)

  const handleReportDeviceIssue = (deviceId: string) => {
    setPrefillDeviceId(deviceId)
    setDeviceReportSignal((n) => n + 1)
    setTab('incidents')
  }

  // Run Camp wizard
  const [runCampCampId, setRunCampCampId] = useState<string | null>(null)
  const runCampCamp = runCampCampId ? camps.find((c) => c.id === runCampCampId) ?? null : null

  const handleRunCamp = (campId: string) => setRunCampCampId(campId)

  return (
    <div className="max-w-7xl">
      <div className="mb-4">
        <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>My Workspace</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Hi, {user?.firstName ?? me.name}</h1>
      </div>

      <div className="flex flex-nowrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors shrink-0"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={12} /> {t.label}
              {t.id === 'notif' && unreadNotifCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{unreadNotifCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'profile' && <ProfileModule me={me} camps={camps.filter((c) => c.foId === me.id)} onNavigate={(id) => setTab(id as TabId)} />}

      {tab === 'dashboard' && (
        <DashboardModule
          me={me}
          camps={camps}
          claims={claims}
          incidents={incidents}
          consumables={consumables}
          training={training}
          onRunCamp={handleRunCamp}
          onNavigate={(id) => setTab(id as TabId)}
        />
      )}

      {tab === 'schedule' && <ScheduleModule me={me} camps={camps} onRunCamp={handleRunCamp} />}

      {tab === 'expenses' && (
        <ExpensesModule me={me} camps={camps} claims={myClaims} fileClaim={fileClaim} />
      )}

      {tab === 'training' && <TrainingModule me={me} />}

      {tab === 'leave' && <LeaveModule me={me} camps={camps} leaves={leaves} applyLeave={applyLeave} />}

      {tab === 'inventory' && <InventoryModule me={me} consumables={consumables} />}

      {tab === 'incidents' && (
        <IncidentsModule
          me={me}
          camps={camps}
          devices={devices}
          incidents={incidents}
          raiseIncident={raiseIncident}
          prefillDeviceId={prefillDeviceId}
          prefillCategory={prefillDeviceId ? 'machine_failure' : undefined}
          openSignal={deviceReportSignal}
          onModalHandled={() => setPrefillDeviceId(undefined)}
        />
      )}

      {tab === 'notif' && (
        <NotificationsModule me={me} notifications={notifications} unreadCount={unreadNotifCount} onMarkAllRead={markAllRead} />
      )}

      {tab === 'attendance' && <AttendanceModule me={me} camps={camps} />}

      {tab === 'reports' && <ReportsModule me={me} camps={camps.filter((c) => c.foId === me.id)} onOpenCamp={handleRunCamp} />}

      {tab === 'devices' && <DevicesModule me={me} devices={devices} onReportIssue={handleReportDeviceIssue} />}

      {tab === 'help' && <HelpModule me={me} camps={camps} devices={devices} raiseIncident={raiseIncident} />}

      {runCampCamp && (
        <RunCampWizard
          open={!!runCampCampId}
          campId={runCampCamp.id}
          camp={runCampCamp}
          me={me}
          onClose={() => setRunCampCampId(null)}
          onSaveCamp={(patch) => patchCamp(runCampCamp.id, patch)}
        />
      )}
    </div>
  )
}

export default FoWorkspacePage
