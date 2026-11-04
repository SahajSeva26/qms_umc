import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FiUser, FiGrid, FiCalendar, FiPackage, FiBell, FiArchive, FiCpu } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useMyEmployee } from '@/features/fieldWorkspace/hooks/useMyEmployee'
import { useMyCamps } from '@/features/fieldWorkspace/hooks/useMyCamps'
import ProfileTab from '@/features/fieldWorkspace/components/ProfileTab'
import DashboardTab from '@/features/fieldWorkspace/components/DashboardTab'
import CampScheduleTab from '@/features/fieldWorkspace/components/CampScheduleTab'
import InventoryTab from '@/features/fieldWorkspace/components/InventoryTab'
import NotificationsTab from '@/features/fieldWorkspace/components/NotificationsTab'
import CampReportsHistoryTab from '@/features/fieldWorkspace/components/CampReportsHistoryTab'
import DevicesTab from '@/features/fieldWorkspace/components/DevicesTab'
import { dayKey } from '@/utils/calendarDate'

type WorkspaceTab = 'profile' | 'dashboard' | 'schedule' | 'inventory' | 'notifications' | 'reports' | 'devices'

const TABS: { id: WorkspaceTab; label: string; icon: typeof FiUser }[] = [
  { id: 'profile', label: 'Profile', icon: FiUser },
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'schedule', label: 'Camp Schedule', icon: FiCalendar },
  { id: 'inventory', label: 'Inventory', icon: FiPackage },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'reports', label: 'Camp Reports History', icon: FiArchive },
  { id: 'devices', label: 'Devices & Machines', icon: FiCpu },
]

// field-officer lives only under the platform tenant AND must be that specific role type — no
// permission uniquely identifies it (camp:search is also held by managers/coordinators).
const FieldWorkspacePage = () => {
  const { session } = usePermission()
  if (session && (session.tenant.type !== 'platform' || session.roleType.code !== 'field-officer')) {
    return <Navigate to="/unauthorized" replace />
  }
  return <FieldWorkspaceContent />
}

// Mirrors the prototype's .fopw-header exactly (fo-portal.js renderWorkspace()).
const FieldWorkspaceContent = () => {
  const [tab, setTab] = useState<WorkspaceTab>('dashboard')
  const { session } = useSession()
  const { employee } = useMyEmployee()
  const todayKey = dayKey(new Date())
  const { data: todayData } = useMyCamps({ dateFrom: todayKey, dateTo: todayKey, status: 'live', limit: '1' })
  const atCampToday = (todayData?.data?.items.length ?? 0) > 0
  const { data: upcomingData } = useMyCamps({ dateFrom: todayKey, status: 'confirmed', limit: '1' })
  const nextUpcoming = upcomingData?.data?.items[0]

  const name = session ? `${session.user.firstName} ${session.user.lastName}`.trim() : ''
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  const phone = employee?.phone

  return (
    <div className="w-full">
      <div
        className="flex items-center gap-2.5 p-3.5 rounded-xl border mb-3 flex-wrap"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,.1), rgba(14,165,233,.06))', borderColor: 'var(--qms-border)' }}
      >
        <div
          className="w-[42px] h-[42px] rounded-[11px] shrink-0 flex items-center justify-center font-extrabold text-base text-white"
          style={{ background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)' }}
        >
          {initials || '—'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px]">{name || 'Field Officer'}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {[phone].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10.5px]"
          style={
            atCampToday
              ? { background: 'rgba(16,185,129,.14)', color: '#047857' }
              : { background: 'rgba(245,158,11,.18)', color: '#92400e' }
          }
        >
          {atCampToday ? 'AT CAMP TODAY' : nextUpcoming ? `NEXT: ${new Date(nextUpcoming.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'IDLE'}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto p-1.5 rounded-xl border mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="px-3 py-2 rounded-[9px] font-bold text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            style={
              tab === id
                ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                : { background: 'transparent', color: 'var(--qms-text-muted)' }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'schedule' && <CampScheduleTab />}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'reports' && <CampReportsHistoryTab />}
      {tab === 'devices' && <DevicesTab />}
    </div>
  )
}

export default FieldWorkspacePage
