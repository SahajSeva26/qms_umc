import { lazy, Suspense, useState } from 'react'
import { FiFolder, FiPlusCircle, FiBarChart2, FiUsers, FiCalendar } from 'react-icons/fi'
import { RouteFallback } from '@qms/ui'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import MrDashboardTab from '@/features/pharma/components/MrDashboardTab'

// Dashboard stays eager (default tab, needs fast first paint). Every other tab is a real,
// separately-downloadable chunk via React.lazy, each with its own local Suspense fallback.
const MyCampScheduleTab = lazy(() => import('@/features/pharma/components/MyCampScheduleTab'))
const PharmaDoctorsTab = lazy(() => import('@/features/pharma/components/PharmaDoctorsTab'))
// Book camp carries RHF + Zod + the Maps SDK boundary (same weight class as the Doctors tab's
// EditDoctorModal) — a user who never books a camp shouldn't download any of it.
const MrBookCampTab = lazy(() => import('@/features/pharma/components/MrBookCampTab'))

type TabId = 'dashboard' | 'projects' | 'book' | 'schedule' | 'doctors'

const TABS: { id: TabId; label: string; icon: typeof FiFolder }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
  { id: 'projects', label: 'Your projects', icon: FiFolder },
  { id: 'book', label: 'Book camp', icon: FiPlusCircle },
  { id: 'schedule', label: 'Camp schedule', icon: FiCalendar },
  { id: 'doctors', label: 'Doctors', icon: FiUsers },
]

// Dashboard, Book camp, Camp schedule, and Doctors are migrated; the rest have no component yet
// so these imports stay honest about what's actually built.
const MrPortalPage = () => {
  const [tab, setTab] = useState<TabId>('dashboard')

  return (
    <PharmaRoleGate roleTypeCode="pharma-mr">
      <div className="w-full">
        <div className="mb-4">
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma · MR Portal</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>MR Portal</h1>
        </div>

        <div className="flex flex-wrap gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--qms-border)' }}>
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
              </button>
            )
          })}
        </div>

        {tab === 'dashboard' && <MrDashboardTab />}
        {tab === 'book' && (
          <Suspense fallback={<RouteFallback />}>
            <MrBookCampTab />
          </Suspense>
        )}
        {tab === 'schedule' && (
          <Suspense fallback={<RouteFallback />}>
            <MyCampScheduleTab />
          </Suspense>
        )}
        {tab === 'doctors' && (
          <Suspense fallback={<RouteFallback />}>
            <PharmaDoctorsTab />
          </Suspense>
        )}
        {tab !== 'dashboard' && tab !== 'book' && tab !== 'schedule' && tab !== 'doctors' && (
          <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Not migrated yet</h2>
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              This tab is still only available on the internal portal while the MR portal migrates tab by tab.
            </p>
          </div>
        )}
      </div>
    </PharmaRoleGate>
  )
}

export default MrPortalPage
